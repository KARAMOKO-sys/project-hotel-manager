import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  ForecastMethod,
  IaPrediction,
  IaPredictionDocument,
  PredictionStatus,
  PredictionType,
} from '../schemas/ia-prediction.entity';
import { CreateIaPredictionDto } from '../dto/create-ia-prediction.dto';
import { UpdateIaPredictionDto } from '../dto/update-ia-prediction.dto';
import {
  AccuracyQueryDto,
  ForecastDto,
  PredictionFilterQueryDto,
} from '../dto/forecast.dto';
import {
  AccuracyMetrics,
  FORECASTER_VERSION,
  ForecastResult,
  TimeSeriesForecaster,
} from '../engine/time-series-forecaster';

const DAY_MS = 86_400_000;
export const DEFAULT_HORIZON = 7;

export interface ForecastResponse extends ForecastResult {
  /** Date associée à chaque point (même ordre que `points`). */
  target_dates: Date[];
  /** Prédictions enregistrées (vide si `persist = false`). */
  predictions: IaPrediction[];
}

export interface AccuracyReport extends AccuracyMetrics {
  by_type: Partial<Record<PredictionType, AccuracyMetrics>>;
}

/**
 * Service de prédictions (demande, occupation, prix, churn, maintenance).
 *
 * Les prévisions sont calculées par `TimeSeriesForecaster` à partir d'un
 * historique fourni en entrée ; les résultats sont stockés puis confrontés
 * aux valeurs réelles pour mesurer la précision (MAE, MAPE).
 */
@Injectable()
export class IaPredictionService extends BaseCrudService<
  IaPrediction,
  CreateIaPredictionDto,
  UpdateIaPredictionDto
> {
  constructor(
    @InjectModel(IaPrediction.name)
    protected readonly predictionModel: Model<IaPredictionDocument>,
  ) {
    super(predictionModel, IaPrediction.name);
  }

  /** Enregistre une prédiction manuelle ; l'horizon est déduit si absent. */
  async create(dto: CreateIaPredictionDto): Promise<IaPrediction> {
    this.assertBounds(dto.lower_bound, dto.upper_bound);
    return super.create({
      ...dto,
      horizon_days:
        dto.horizon_days ?? this.daysFromToday(new Date(dto.target_date)),
      method: dto.method ?? ForecastMethod.MANUAL,
      status: PredictionStatus.PENDING,
    } as CreateIaPredictionDto);
  }

  /** Calcule (et enregistre par défaut) une prévision journalière. */
  async forecast(dto: ForecastDto): Promise<ForecastResponse> {
    if (!dto.history || dto.history.length === 0) {
      throw new BadRequestException('Historique vide : impossible de prévoir');
    }
    this.assertBounds(dto.min_value, dto.max_value);

    let result: ForecastResult;
    try {
      result = TimeSeriesForecaster.forecast(
        dto.history,
        dto.horizon ?? DEFAULT_HORIZON,
        {
          method: dto.method,
          window: dto.window,
          min: dto.min_value,
          max: dto.max_value,
        },
      );
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const start = dto.start_date
      ? this.startOfDayUtc(new Date(dto.start_date))
      : new Date(this.startOfDayUtc(new Date()).getTime() + DAY_MS);
    const targetDates = result.points.map(
      (p) => new Date(start.getTime() + (p.step - 1) * DAY_MS),
    );

    let predictions: IaPrediction[] = [];
    if (dto.persist !== false) {
      predictions = await Promise.all(
        result.points.map((point, i) =>
          this.repository.create({
            property_id: this.toObjectId(dto.property_id),
            type: dto.type,
            target: dto.target,
            ...(dto.target_id && { target_id: this.toObjectId(dto.target_id) }),
            target_date: targetDates[i],
            horizon_days: this.daysFromToday(targetDates[i]),
            predicted_value: point.value,
            lower_bound: point.lower,
            upper_bound: point.upper,
            confidence: result.confidence,
            method: result.method,
            model_version: FORECASTER_VERSION,
            input_summary: result.summary,
            status: PredictionStatus.PENDING,
          }),
        ),
      );
    }

    return { ...result, target_dates: targetDates, predictions };
  }

  /** Enregistre la valeur réelle observée et calcule l'erreur. */
  async recordActual(id: string, actualValue: number): Promise<IaPrediction> {
    if (!Number.isFinite(actualValue)) {
      throw new BadRequestException('Valeur réelle invalide');
    }
    const prediction = await this.findOne(id);
    const absoluteError = Math.abs(prediction.predicted_value - actualValue);
    const percentageError =
      actualValue === 0
        ? undefined
        : Math.round((absoluteError / Math.abs(actualValue)) * 10000) / 100;

    return this.update(id, {
      actual_value: actualValue,
      actual_recorded_at: new Date(),
      absolute_error: Math.round(absoluteError * 10000) / 10000,
      percentage_error: percentageError,
      status: PredictionStatus.EVALUATED,
    } as UpdateIaPredictionDto);
  }

  /** Précision des prédictions évaluées (MAE, MAPE), globale et par type. */
  async getAccuracy(query: AccuracyQueryDto = {}): Promise<AccuracyReport> {
    const filter: QueryFilter<IaPrediction> = {
      status: PredictionStatus.EVALUATED,
      is_deleted: { $ne: true },
    };
    if (query.property_id) {
      filter.property_id = this.toObjectId(query.property_id);
    }
    if (query.type) filter.type = query.type;
    if (query.method) filter.method = query.method;
    if (query.model_version) filter.model_version = query.model_version;
    if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : undefined;
      const to = query.to ? new Date(query.to) : undefined;
      if (from && to && from > to) {
        throw new BadRequestException(
          'La date de début doit précéder la date de fin',
        );
      }
      filter.target_date = {
        ...(from && { $gte: from }),
        ...(to && { $lte: to }),
      };
    }

    const evaluated = await this.repository.find(filter);
    const toPairs = (items: IaPrediction[]) =>
      items
        .filter((p) => typeof p.actual_value === 'number')
        .map((p) => ({
          predicted: p.predicted_value,
          actual: p.actual_value!,
        }));

    const byType: Partial<Record<PredictionType, AccuracyMetrics>> = {};
    for (const type of new Set(evaluated.map((p) => p.type))) {
      byType[type] = TimeSeriesForecaster.accuracy(
        toPairs(evaluated.filter((p) => p.type === type)),
      );
    }

    return {
      ...TimeSeriesForecaster.accuracy(toPairs(evaluated)),
      by_type: byType,
    };
  }

  /** Prédictions d'une propriété, filtrables par type et statut. */
  findByProperty(propertyId: string, query: PredictionFilterQueryDto) {
    return this.findAll(
      { ...query, sort: query.sort ?? 'target_date' },
      {
        property_id: this.toObjectId(propertyId),
        ...(query.type && { type: query.type }),
        ...(query.status && { status: query.status }),
      },
    );
  }

  /** Prédictions échues dont la valeur réelle n'a pas encore été saisie. */
  async getPendingEvaluation(
    propertyId: string,
    limit = 100,
  ): Promise<IaPrediction[]> {
    return this.repository.find(
      {
        property_id: this.toObjectId(propertyId),
        status: PredictionStatus.PENDING,
        target_date: { $lte: new Date() },
        is_deleted: { $ne: true },
      },
      { sort: 'target_date', limit },
    );
  }

  private assertBounds(min?: number, max?: number): void {
    if (min !== undefined && max !== undefined && min > max) {
      throw new BadRequestException(
        'La borne inférieure doit être ≤ à la borne supérieure',
      );
    }
  }

  private startOfDayUtc(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private daysFromToday(date: Date): number {
    const today = this.startOfDayUtc(new Date()).getTime();
    return Math.max(
      0,
      Math.round((this.startOfDayUtc(date).getTime() - today) / DAY_MS),
    );
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide : ${id}`);
    }
    return new Types.ObjectId(id);
  }
}
