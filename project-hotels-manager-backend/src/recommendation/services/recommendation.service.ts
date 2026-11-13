import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { Currency } from '../../base-entities/enums/currency.enum';
import {
  Recommendation,
  RecommendationDocument,
  RecommendationStatus,
} from '../schemas/recommendation.entity';
import { CreateRecommendationDto } from '../dto/create-recommendation.dto';
import { UpdateRecommendationDto } from '../dto/update-recommendation.dto';
import {
  GenerateRecommendationsDto,
  ScoreCandidatesDto,
} from '../dto/generate-recommendations.dto';
import {
  AcceptRecommendationDto,
  ConversionStatsQueryDto,
  RecommendationFilterQueryDto,
} from '../dto/recommendation-query.dto';
import {
  ContentBasedScorer,
  SCORER_VERSION,
  ScoredCandidate,
} from '../engine/content-based.scorer';
import {
  computeConversionStats,
  ConversionStats,
} from '../engine/conversion-stats';

/** Durée de validité par défaut d'une recommandation générée. */
export const DEFAULT_TTL_DAYS = 7;

const OPEN_STATUSES = [
  RecommendationStatus.PENDING,
  RecommendationStatus.SHOWN,
];

/**
 * Service de recommandations personnalisées (upsell, cross-sell, services,
 * chambres, forfaits).
 *
 * Le scoring est assuré par `ContentBasedScorer` à partir du profil client
 * et des candidats fournis par l'appelant : le module reste autonome et
 * n'interroge pas les autres domaines.
 */
@Injectable()
export class RecommendationService extends BaseCrudService<
  Recommendation,
  CreateRecommendationDto,
  UpdateRecommendationDto
> {
  private readonly scorer = new ContentBasedScorer();

  constructor(
    @InjectModel(Recommendation.name)
    protected readonly recommendationModel: Model<RecommendationDocument>,
  ) {
    super(recommendationModel, Recommendation.name);
  }

  /** Classe des candidats pour un profil, sans rien enregistrer. */
  scoreCandidates(dto: ScoreCandidatesDto): ScoredCandidate[] {
    return this.scorer.rank(dto.profile, dto.candidates, {
      limit: dto.limit,
      min_score: dto.min_score,
    });
  }

  /**
   * Génère et enregistre les meilleures recommandations d'un client.
   * Retourne une liste vide si aucun candidat n'atteint le score minimal.
   */
  async generateForGuest(
    dto: GenerateRecommendationsDto,
  ): Promise<Recommendation[]> {
    const ranked = this.scoreCandidates(dto);
    if (ranked.length === 0) return [];

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.ttl_days ?? DEFAULT_TTL_DAYS));

    return Promise.all(
      ranked.map((candidate) =>
        this.repository.create({
          guest_id: this.toObjectId(dto.guest_id),
          property_id: this.toObjectId(dto.property_id),
          ...(dto.reservation_id && {
            reservation_id: this.toObjectId(dto.reservation_id),
          }),
          type: candidate.type,
          title: candidate.title,
          description: candidate.description,
          category: candidate.category,
          tags: candidate.tags ?? [],
          ...(candidate.item_id && {
            item_id: this.toObjectId(candidate.item_id),
          }),
          item_type: candidate.item_type,
          ...(candidate.price !== undefined && {
            price: {
              amount: candidate.price,
              currency: dto.currency ?? Currency.XOF,
            } as never,
          }),
          score: candidate.score,
          reasons: candidate.reasons,
          status: RecommendationStatus.PENDING,
          expires_at: expiresAt,
          model_version: SCORER_VERSION,
          metadata: { breakdown: candidate.breakdown },
        }),
      ),
    );
  }

  /** Recommandations d'un client, filtrables par statut et type. */
  findByGuest(guestId: string, query: RecommendationFilterQueryDto) {
    return this.findAll(query, {
      guest_id: this.toObjectId(guestId),
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
    });
  }

  /** Recommandations encore actionnables d'un client, par score décroissant. */
  async getActiveForGuest(guestId: string): Promise<Recommendation[]> {
    return this.repository.find(
      {
        guest_id: this.toObjectId(guestId),
        status: { $in: OPEN_STATUSES },
        is_deleted: { $ne: true },
        $or: [
          { expires_at: { $exists: false } },
          { expires_at: null },
          { expires_at: { $gt: new Date() } },
        ],
      },
      { sort: '-score' },
    );
  }

  /** Enregistre l'affichage d'une recommandation (idempotent). */
  async markAsShown(id: string): Promise<Recommendation> {
    const rec = await this.findOne(id);
    if (rec.status === RecommendationStatus.SHOWN) return rec;
    this.assertOpen(rec);
    return this.setFields(id, {
      status: RecommendationStatus.SHOWN,
      shown_at: new Date(),
    });
  }

  /** Accepte une recommandation et enregistre le revenu associé. */
  async accept(
    id: string,
    dto: AcceptRecommendationDto = {},
  ): Promise<Recommendation> {
    const rec = await this.findOne(id);
    this.assertOpen(rec);
    const now = new Date();
    return this.setFields(id, {
      status: RecommendationStatus.ACCEPTED,
      responded_at: now,
      shown_at: rec.shown_at ?? now,
      revenue_generated: dto.revenue ?? rec.price?.amount ?? 0,
    });
  }

  /** Refuse une recommandation. */
  async dismiss(id: string, reason?: string): Promise<Recommendation> {
    const rec = await this.findOne(id);
    this.assertOpen(rec);
    const now = new Date();
    return this.setFields(id, {
      status: RecommendationStatus.DISMISSED,
      responded_at: now,
      shown_at: rec.shown_at ?? now,
      ...(reason && { dismiss_reason: reason }),
    });
  }

  /** Passe en « expirée » les recommandations ouvertes arrivées à échéance. */
  async expireOutdated(now = new Date()): Promise<{ expired: number }> {
    const result = await this.recommendationModel
      .updateMany(
        { status: { $in: OPEN_STATUSES }, expires_at: { $lte: now } },
        { $set: { status: RecommendationStatus.EXPIRED } },
      )
      .exec();
    return { expired: result.modifiedCount ?? 0 };
  }

  /** Statistiques de conversion (taux d'acceptation, revenu généré…). */
  async getConversionStats(
    query: ConversionStatsQueryDto = {},
  ): Promise<ConversionStats> {
    const filter: QueryFilter<Recommendation> = { is_deleted: { $ne: true } };
    if (query.property_id) {
      filter.property_id = this.toObjectId(query.property_id);
    }
    if (query.guest_id) filter.guest_id = this.toObjectId(query.guest_id);
    if (query.type) filter.type = query.type;
    if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : undefined;
      const to = query.to ? new Date(query.to) : undefined;
      if (from && to && from > to) {
        throw new BadRequestException(
          'La date de début doit précéder la date de fin',
        );
      }
      filter.created_at = {
        ...(from && { $gte: from }),
        ...(to && { $lte: to }),
      };
    }
    const recs = await this.repository.find(filter);
    return computeConversionStats(recs);
  }

  /** Vérifie qu'une recommandation peut encore recevoir une réponse. */
  private assertOpen(rec: Recommendation): void {
    if (!OPEN_STATUSES.includes(rec.status)) {
      throw new BadRequestException(
        `Recommandation déjà traitée (statut : ${rec.status})`,
      );
    }
    if (rec.expires_at && rec.expires_at.getTime() <= Date.now()) {
      throw new BadRequestException('Recommandation expirée');
    }
  }

  private setFields(
    id: string,
    fields: Record<string, unknown>,
  ): Promise<Recommendation> {
    return this.update(id, fields as UpdateRecommendationDto);
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide : ${id}`);
    }
    return new Types.ObjectId(id);
  }
}
