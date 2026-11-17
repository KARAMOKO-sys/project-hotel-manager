import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  ReviewSource,
  SentimentAnalysis,
  SentimentAnalysisDocument,
  SentimentLabel,
} from '../schemas/sentiment-analysis.entity';
import { CreateSentimentAnalysisDto } from '../dto/create-sentiment-analysis.dto';
import { UpdateSentimentAnalysisDto } from '../dto/update-sentiment-analysis.dto';
import {
  SentimentFilterQueryDto,
  SentimentPeriodQueryDto,
  SentimentTrendQueryDto,
} from '../dto/sentiment-query.dto';
import {
  LexiconSentimentScorer,
  SentimentScore,
} from '../engine/lexicon-sentiment.scorer';
import {
  buildSentimentTrend,
  improvementSuggestions,
  SentimentSummary,
  summarizeSentiments,
  TrendPoint,
} from '../engine/sentiment-summary';

/** Seuil par défaut de remontée des alertes (score ≤ seuil). */
export const DEFAULT_ALERT_THRESHOLD = -0.4;

/** Une note source ≤ à cette valeur déclenche une alerte quel que soit le texte. */
const LOW_RATING_ALERT = 2;

/**
 * Service d'analyse de sentiment des avis clients.
 *
 * Le calcul est délégué à `LexiconSentimentScorer` (lexique fr/en, sans
 * fournisseur d'IA externe) ; ce service persiste les résultats, gère les
 * alertes sur avis négatifs et produit les agrégats par propriété.
 */
@Injectable()
export class SentimentAnalysisService extends BaseCrudService<
  SentimentAnalysis,
  CreateSentimentAnalysisDto,
  UpdateSentimentAnalysisDto
> {
  private readonly scorer = new LexiconSentimentScorer();

  constructor(
    @InjectModel(SentimentAnalysis.name)
    protected readonly sentimentModel: Model<SentimentAnalysis>,
  ) {
    super(sentimentModel, SentimentAnalysis.name);
  }

  /** Analyse un texte sans le persister. */
  analyzeText(text: string): SentimentScore {
    return this.scorer.score(text);
  }

  /** Analyse un avis et enregistre le résultat. */
  async create(dto: CreateSentimentAnalysisDto): Promise<SentimentAnalysis> {
    return super.create({
      ...dto,
      source: dto.source ?? ReviewSource.INTERNAL,
      ...this.buildAnalysisFields(dto.text, dto.rating, dto.language),
    } as CreateSentimentAnalysisDto);
  }

  /** Met à jour un avis ; recalcule l'analyse si le texte ou la note change. */
  async update(
    id: string,
    dto: UpdateSentimentAnalysisDto,
  ): Promise<SentimentAnalysis> {
    if (dto.text === undefined && dto.rating === undefined) {
      return super.update(id, dto);
    }
    const existing = await this.findOne(id);
    const text = dto.text ?? existing.text;
    const rating = dto.rating ?? existing.rating;
    return super.update(id, {
      ...dto,
      ...this.buildAnalysisFields(
        text,
        rating,
        dto.language ?? existing.language,
      ),
    } as UpdateSentimentAnalysisDto);
  }

  /** Avis d'une propriété, filtrables par libellé. */
  findByProperty(propertyId: string, query: SentimentFilterQueryDto) {
    return this.findAll(query, {
      property_id: this.toObjectId(propertyId),
      ...(query.label && { label: query.label }),
    });
  }

  /** Synthèse des sentiments d'une propriété sur une période. */
  async getSummary(
    propertyId: string,
    period: SentimentPeriodQueryDto = {},
  ): Promise<SentimentSummary> {
    return summarizeSentiments(await this.loadSamples(propertyId, period));
  }

  /** Tendance du sentiment dans le temps. */
  async getTrends(
    propertyId: string,
    query: SentimentTrendQueryDto = {},
  ): Promise<TrendPoint[]> {
    const samples = await this.loadSamples(propertyId, query);
    return buildSentimentTrend(samples, query.granularity ?? 'month');
  }

  /** Avis négatifs non traités, du plus négatif au moins négatif. */
  async getAlerts(
    propertyId: string,
    threshold = DEFAULT_ALERT_THRESHOLD,
  ): Promise<SentimentAnalysis[]> {
    return this.repository.find(
      {
        property_id: this.toObjectId(propertyId),
        is_alert: true,
        alert_acknowledged: { $ne: true },
        score: { $lte: threshold },
        is_deleted: { $ne: true },
      },
      { sort: 'score' },
    );
  }

  /** Marque une alerte comme prise en charge. */
  async acknowledgeAlert(
    id: string,
    userId?: string,
  ): Promise<SentimentAnalysis> {
    const analysis = await this.findOne(id);
    if (!analysis.is_alert) {
      throw new BadRequestException(
        'Cet avis ne fait pas l’objet d’une alerte',
      );
    }
    return super.update(id, {
      alert_acknowledged: true,
      acknowledged_at: new Date(),
      ...(userId && { acknowledged_by: this.toObjectId(userId) }),
    } as UpdateSentimentAnalysisDto);
  }

  /** Suggestions d'amélioration fondées sur les aspects mal notés. */
  async getImprovementSuggestions(
    propertyId: string,
    period: SentimentPeriodQueryDto = {},
  ) {
    return improvementSuggestions(await this.getSummary(propertyId, period));
  }

  /** Calcule les champs dérivés d'une analyse. */
  private buildAnalysisFields(
    text: string,
    rating?: number,
    language?: string,
  ) {
    const result = this.scorer.score(text);
    const lowRating = rating !== undefined && rating <= LOW_RATING_ALERT;
    return {
      score: result.score,
      label: result.label,
      confidence: result.confidence,
      language: language ?? result.language ?? undefined,
      aspects: result.aspects,
      emotions: result.emotions,
      is_alert: result.label === SentimentLabel.NEGATIVE || lowRating,
      alert_acknowledged: false,
      model_version: result.model_version,
      analyzed_at: new Date(),
    };
  }

  private async loadSamples(
    propertyId: string,
    period: SentimentPeriodQueryDto,
  ): Promise<SentimentAnalysis[]> {
    const filter: QueryFilter<SentimentAnalysis> = {
      property_id: this.toObjectId(propertyId),
      is_deleted: { $ne: true },
    };
    const range = this.buildDateRange(period);
    if (range) filter.analyzed_at = range;
    return this.repository.find(filter, { sort: 'analyzed_at' });
  }

  private buildDateRange(
    period: SentimentPeriodQueryDto,
  ): { $gte?: Date; $lte?: Date } | null {
    if (!period.from && !period.to) return null;
    const from = period.from ? new Date(period.from) : undefined;
    const to = period.to ? new Date(period.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException(
        'La date de début doit précéder la date de fin',
      );
    }
    return { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide : ${id}`);
    }
    return new Types.ObjectId(id);
  }
}
