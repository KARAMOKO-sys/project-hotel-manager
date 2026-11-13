import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  Kpi,
  KpiDocument,
  KpiMetric,
  KpiPeriodType,
} from '../schemas/kpi.entity';
import {
  ComparePeriodsDto,
  CreateKpiDto,
  KpiInputDto,
} from '../dto/create-kpi.dto';
import { UpdateKpiDto } from '../dto/update-kpi.dto';
import { KpiFilterQueryDto, KpiTrendQueryDto } from '../dto/kpi-query.dto';
import {
  compareMetrics,
  computeKpis,
  KpiInput,
  KpiMetrics,
  MetricVariation,
  validateKpiInput,
} from '../engine/kpi-calculator';

const INPUT_FIELDS: (keyof KpiInput)[] = [
  'rooms_available',
  'rooms_sold',
  'room_revenue',
  'total_revenue',
  'gross_operating_profit',
  'reservations_count',
  'cancellations_count',
  'stays_count',
];

export interface KpiTrendPoint {
  period_start: Date;
  period_end: Date;
  value: number | null;
}

export interface KpiComparison {
  current: Kpi;
  previous: Kpi | null;
  variations: Partial<Record<KpiMetric, MetricVariation>>;
}

/**
 * Service des indicateurs de performance (taux d'occupation, ADR, RevPAR…).
 *
 * Les données brutes sont fournies en entrée (aucune dépendance aux autres
 * modules) ; les indicateurs sont calculés par les fonctions pures de
 * `kpi-calculator` puis historisés par propriété et par période.
 */
@Injectable()
export class KpiService extends BaseCrudService<
  Kpi,
  CreateKpiDto,
  UpdateKpiDto
> {
  constructor(
    @InjectModel(Kpi.name)
    protected readonly kpiModel: Model<KpiDocument>,
  ) {
    super(kpiModel, Kpi.name);
  }

  /** Calcule les indicateurs sans les enregistrer. */
  calculate(input: KpiInputDto): KpiMetrics {
    this.assertValidInput(input);
    return computeKpis(input);
  }

  /** Compare deux périodes fournies en entrée. */
  comparePeriods(dto: ComparePeriodsDto) {
    const current = this.calculate(dto.current);
    const previous = this.calculate(dto.previous);
    return {
      current,
      previous,
      variations: compareMetrics(
        this.toMetricRecord({ ...dto.current, ...current }),
        this.toMetricRecord({ ...dto.previous, ...previous }),
      ),
    };
  }

  /** Calcule et enregistre un instantané de KPI. */
  async create(dto: CreateKpiDto): Promise<Kpi> {
    this.assertValidPeriod(dto.period_start, dto.period_end);
    const metrics = this.calculate(dto);
    try {
      return await super.create({
        ...dto,
        ...metrics,
        goppar: metrics.goppar ?? undefined,
        computed_at: new Date(),
      } as CreateKpiDto);
    } catch (error) {
      throw this.mapDuplicate(error);
    }
  }

  /** Met à jour les données brutes et recalcule les indicateurs. */
  async update(id: string, dto: UpdateKpiDto): Promise<Kpi> {
    const touchesInputs = INPUT_FIELDS.some((f) => dto[f] !== undefined);
    const touchesPeriod =
      dto.period_start !== undefined || dto.period_end !== undefined;
    if (!touchesInputs && !touchesPeriod) {
      return super.update(id, dto);
    }

    const existing = await this.findOne(id);
    if (touchesPeriod) {
      this.assertValidPeriod(
        dto.period_start ?? existing.period_start,
        dto.period_end ?? existing.period_end,
      );
    }
    let computed: Partial<Kpi> = {};
    if (touchesInputs) {
      const merged = Object.fromEntries(
        INPUT_FIELDS.map((f) => [f, dto[f] ?? existing[f]]),
      ) as unknown as KpiInput;
      const metrics = this.calculate(merged);
      computed = {
        ...metrics,
        goppar: metrics.goppar ?? undefined,
        computed_at: new Date(),
      };
    }
    try {
      return await super.update(id, { ...dto, ...computed } as UpdateKpiDto);
    } catch (error) {
      throw this.mapDuplicate(error);
    }
  }

  /** Instantanés d'une propriété (les plus récents d'abord). */
  findByProperty(propertyId: string, query: KpiFilterQueryDto) {
    return this.findAll(
      { ...query, sort: query.sort ?? '-period_start' },
      {
        property_id: this.toObjectId(propertyId),
        ...(query.period_type && { period_type: query.period_type }),
      },
    );
  }

  /** Dernier instantané disponible d'une propriété. */
  async getLatest(
    propertyId: string,
    periodType?: KpiPeriodType,
  ): Promise<Kpi> {
    const [latest] = await this.repository.find(
      {
        property_id: this.toObjectId(propertyId),
        is_deleted: { $ne: true },
        ...(periodType && { period_type: periodType }),
      },
      { sort: '-period_start', limit: 1 },
    );
    if (!latest) {
      throw new NotFoundException('Aucun KPI disponible pour cette propriété');
    }
    return latest;
  }

  /** Série chronologique d'un indicateur. */
  async getTrend(
    propertyId: string,
    query: KpiTrendQueryDto,
  ): Promise<KpiTrendPoint[]> {
    if (!Object.values(KpiMetric).includes(query.metric)) {
      throw new BadRequestException(`Indicateur inconnu : ${query.metric}`);
    }
    const filter: QueryFilter<Kpi> = {
      property_id: this.toObjectId(propertyId),
      is_deleted: { $ne: true },
      ...(query.period_type && { period_type: query.period_type }),
    };
    if (query.from || query.to) {
      if (query.from && query.to) this.assertValidPeriod(query.from, query.to);
      filter.period_start = {
        ...(query.from && { $gte: new Date(query.from) }),
        ...(query.to && { $lte: new Date(query.to) }),
      };
    }
    const snapshots = await this.repository.find(filter, {
      sort: 'period_start',
    });
    return snapshots.map((k) => ({
      period_start: k.period_start,
      period_end: k.period_end,
      value: k[query.metric] ?? null,
    }));
  }

  /** Compare un instantané avec la période précédente de même granularité. */
  async compareWithPrevious(id: string): Promise<KpiComparison> {
    const current = await this.findOne(id);
    const [previous] = await this.repository.find(
      {
        property_id: current.property_id,
        period_type: current.period_type,
        period_start: { $lt: current.period_start },
        is_deleted: { $ne: true },
      },
      { sort: '-period_start', limit: 1 },
    );
    return {
      current,
      previous: previous ?? null,
      variations: compareMetrics(
        this.toMetricRecord(current),
        previous ? this.toMetricRecord(previous) : null,
      ),
    };
  }

  private toMetricRecord(
    source: object,
  ): Partial<Record<KpiMetric, number | null>> {
    const values = source as Partial<Record<KpiMetric, unknown>>;
    const record: Partial<Record<KpiMetric, number | null>> = {};
    for (const metric of Object.values(KpiMetric)) {
      const value = values[metric];
      record[metric] = typeof value === 'number' ? value : null;
    }
    return record;
  }

  private assertValidInput(input: KpiInput): void {
    const errors = validateKpiInput(input);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  private assertValidPeriod(start: string | Date, end: string | Date): void {
    if (new Date(start).getTime() > new Date(end).getTime()) {
      throw new BadRequestException(
        'period_start doit précéder ou égaler period_end',
      );
    }
  }

  private mapDuplicate(error: unknown): unknown {
    if ((error as { code?: number })?.code === 11000) {
      return new ConflictException(
        'Un instantané existe déjà pour cette propriété, granularité et date de début',
      );
    }
    return error;
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide : ${id}`);
    }
    return new Types.ObjectId(id);
  }
}
