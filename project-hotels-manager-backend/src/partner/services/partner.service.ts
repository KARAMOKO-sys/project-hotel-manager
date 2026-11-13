import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  Partner,
  PartnerDocument,
  PartnerStatus,
  PartnerType,
} from '../schemas/partner.entity';
import { CreatePartnerDto } from '../dto/create-partner.dto';
import { UpdatePartnerDto } from '../dto/update-partner.dto';

/** Nombre de tours de sel bcrypt utilisés pour hasher les mots de passe. */
const SALT_ROUNDS = 10;

/** Version des conditions générales acceptées à l'inscription. */
export const PARTNER_TERMS_VERSION = '1.0';

/** Résultat d'un calcul de commission. */
export interface CommissionResult {
  amount: number;
  commission_rate: number;
  commission: number;
}

/** Statistiques globales des partenaires. */
export interface PartnerStatistics {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  total_properties_listed: number;
  total_commission_earned: number;
  avg_commission_rate: number;
}

/**
 * Service de gestion des partenaires (agences, promoteurs, gestionnaires...).
 *
 * Étend le CRUD générique et ajoute : inscription (hash du mot de passe,
 * consentements, statut « en attente »), workflow d'approbation (approuver,
 * rejeter, suspendre, réactiver, bloquer), commissions, limite et
 * rattachement de propriétés, réservations apportées, avis et statistiques.
 *
 * Le hash du mot de passe (`password_hash`, `select: false`) n'est jamais
 * renvoyé par ce service.
 */
@Injectable()
export class PartnerService extends BaseCrudService<
  Partner,
  CreatePartnerDto,
  UpdatePartnerDto
> {
  constructor(
    @InjectModel(Partner.name)
    protected readonly partnerModel: Model<PartnerDocument>,
  ) {
    super(partnerModel, Partner.name);
  }

  /**
   * Inscrit un partenaire « en attente de validation ». Les coordonnées de
   * contact reprennent par défaut celles du compte.
   */
  async create(createPartnerDto: CreatePartnerDto): Promise<Partner> {
    const { password, terms_accepted, data_processing_accepted, ...rest } =
      createPartnerDto;
    if (terms_accepted !== true || data_processing_accepted !== true) {
      throw new BadRequestException(
        'Les conditions générales et le traitement des données doivent être acceptés',
      );
    }
    const email = rest.email.toLowerCase().trim();
    await this.ensureEmailAvailable(email);

    const fullName = [rest.first_name, rest.last_name]
      .filter(Boolean)
      .join(' ');
    const now = new Date();

    const partner = new this.partnerModel({
      ...rest,
      email,
      contact_name: rest.contact_name ?? (fullName || undefined),
      contact_email: rest.contact_email ?? email,
      contact_phone: rest.contact_phone ?? rest.phone,
      partner_status: PartnerStatus.PENDING,
      metadata: {
        terms_accepted_at: now,
        data_processing_accepted_at: now,
        terms_version: PARTNER_TERMS_VERSION,
      },
      password_hash: await bcrypt.hash(password, SALT_ROUNDS),
      password_changed_at: now,
    });

    const saved = await partner.save();
    return this.sanitize(saved as unknown as Partner);
  }

  /** Liste paginée, avec recherche libre optionnelle (`?search=`). */
  async findAll(
    query: PaginationQueryDto,
    filter: QueryFilter<Partner> = {},
  ): Promise<PaginatedResult<Partner>> {
    const searchFilter = query.search
      ? this.buildSearchFilter(query.search)
      : {};
    return super.findAll(query, {
      ...filter,
      ...searchFilter,
    } as QueryFilter<Partner>);
  }

  /** Met à jour un partenaire en vérifiant l'unicité de l'email. */
  async update(
    id: string,
    updatePartnerDto: UpdatePartnerDto,
  ): Promise<Partner> {
    if (updatePartnerDto.email) {
      updatePartnerDto.email = updatePartnerDto.email.toLowerCase().trim();
      await this.ensureEmailAvailable(updatePartnerDto.email, id);
    }
    return super.update(id, updatePartnerDto);
  }

  /** Recherche un partenaire par email (insensible à la casse). */
  async findByEmail(email: string): Promise<Partner> {
    const partner = await this.repository.findOne({
      email: email.toLowerCase().trim(),
      is_deleted: { $ne: true },
    } as QueryFilter<Partner>);
    if (!partner) {
      throw new NotFoundException(`Partner avec l'email ${email} introuvable`);
    }
    return partner;
  }

  /** Recherche textuelle (société, contact, email, téléphone). */
  async search(searchTerm: string): Promise<Partner[]> {
    if (!searchTerm || !searchTerm.trim()) {
      throw new BadRequestException('Le terme de recherche est requis');
    }
    return this.repository.find(
      {
        ...this.buildSearchFilter(searchTerm),
        is_deleted: { $ne: true },
      } as QueryFilter<Partner>,
      { sort: 'company_name', limit: 50 },
    );
  }

  /** Liste les partenaires d'un statut donné. */
  findByStatus(
    status: PartnerStatus,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Partner>> {
    if (!Object.values(PartnerStatus).includes(status)) {
      throw new BadRequestException(`Statut invalide : ${status}`);
    }
    return this.findAll(query, {
      partner_status: status,
    } as QueryFilter<Partner>);
  }

  /** Liste les inscriptions en attente (les plus anciennes d'abord). */
  findPending(query: PaginationQueryDto): Promise<PaginatedResult<Partner>> {
    return this.findAll({ ...query, sort: query.sort ?? 'created_at' }, {
      partner_status: PartnerStatus.PENDING,
    } as QueryFilter<Partner>);
  }

  /** Liste les partenaires actifs d'un type donné. */
  findByType(
    type: PartnerType,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Partner>> {
    if (!Object.values(PartnerType).includes(type)) {
      throw new BadRequestException(`Type de partenaire invalide : ${type}`);
    }
    return this.findAll(query, {
      partner_type: type,
      partner_status: PartnerStatus.ACTIVE,
    } as QueryFilter<Partner>);
  }

  /**
   * Approuve une inscription en attente. Le justificatif d'immatriculation
   * de la société est requis.
   */
  async approve(id: string, verifiedBy?: string): Promise<Partner> {
    const partner = await this.findOne(id);
    if (partner.partner_status !== PartnerStatus.PENDING) {
      throw new BadRequestException(
        'Seul un partenaire en attente peut être approuvé',
      );
    }
    if (!partner.registration_document_url) {
      throw new BadRequestException(
        "Le document d'immatriculation est requis pour l'approbation",
      );
    }
    const update: Record<string, unknown> = {
      partner_status: PartnerStatus.ACTIVE,
      is_active: true,
      verified_at: new Date(),
      rejection_reason: null,
    };
    if (verifiedBy) {
      update.verified_by = this.toObjectId(verifiedBy, 'verified_by');
    }
    return this.updateOrFail(id, update as UpdateQuery<Partner>);
  }

  /** Rejette une inscription en attente (raison obligatoire). */
  async reject(id: string, reason: string): Promise<Partner> {
    const cleanReason = this.requireReason(reason);
    const partner = await this.findOne(id);
    if (partner.partner_status !== PartnerStatus.PENDING) {
      throw new BadRequestException(
        'Seul un partenaire en attente peut être rejeté',
      );
    }
    return this.updateOrFail(id, {
      partner_status: PartnerStatus.REJECTED,
      is_active: false,
      rejection_reason: cleanReason,
    });
  }

  /** Suspend un partenaire actif. */
  async suspend(id: string, reason?: string): Promise<Partner> {
    const partner = await this.findOne(id);
    if (partner.partner_status !== PartnerStatus.ACTIVE) {
      throw new BadRequestException(
        'Seul un partenaire actif peut être suspendu',
      );
    }
    return this.updateOrFail(id, {
      partner_status: PartnerStatus.SUSPENDED,
      is_active: false,
      'metadata.suspension_reason': reason ?? null,
      'metadata.suspended_at': new Date(),
    } as UpdateQuery<Partner>);
  }

  /** Réactive un partenaire suspendu. */
  async reactivate(id: string): Promise<Partner> {
    const partner = await this.findOne(id);
    if (partner.partner_status !== PartnerStatus.SUSPENDED) {
      throw new BadRequestException(
        'Seul un partenaire suspendu peut être réactivé',
      );
    }
    return this.updateOrFail(id, {
      partner_status: PartnerStatus.ACTIVE,
      is_active: true,
      'metadata.suspension_reason': null,
      'metadata.reactivated_at': new Date(),
    } as UpdateQuery<Partner>);
  }

  /** Bloque définitivement un partenaire (fraude, abus...). */
  async block(id: string, reason: string): Promise<Partner> {
    const cleanReason = this.requireReason(reason);
    const partner = await this.findOne(id);
    if (partner.partner_status === PartnerStatus.BLOCKED) {
      throw new BadRequestException('Ce partenaire est déjà bloqué');
    }
    return this.updateOrFail(id, {
      partner_status: PartnerStatus.BLOCKED,
      is_active: false,
      'metadata.block_reason': cleanReason,
      'metadata.blocked_at': new Date(),
    } as UpdateQuery<Partner>);
  }

  /** Active le compte d'un partenaire déjà approuvé (inactif). */
  async activate(id: string): Promise<Partner> {
    const partner = await this.findOne(id);
    if (!partner.verified_at) {
      throw new BadRequestException(
        'Le partenaire doit être approuvé avant activation',
      );
    }
    if (partner.partner_status === PartnerStatus.BLOCKED) {
      throw new BadRequestException('Un partenaire bloqué ne peut être activé');
    }
    return this.updateOrFail(id, {
      partner_status: PartnerStatus.ACTIVE,
      is_active: true,
    });
  }

  /** Désactive le compte. */
  deactivate(id: string): Promise<Partner> {
    return this.updateOrFail(id, {
      partner_status: PartnerStatus.INACTIVE,
      is_active: false,
    });
  }

  /** Change le mot de passe après vérification de l'ancien. */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<Partner> {
    const partner = await this.repository.findOne(
      { _id: id, is_deleted: { $ne: true } } as QueryFilter<Partner>,
      { select: '+password_hash' },
    );
    if (!partner) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    if (!(await bcrypt.compare(currentPassword, partner.password_hash))) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    if (await bcrypt.compare(newPassword, partner.password_hash)) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
    }
    return this.updateOrFail(id, {
      password_hash: await bcrypt.hash(newPassword, SALT_ROUNDS),
      password_changed_at: new Date(),
      failed_login_attempts: 0,
      locked_until: null,
    } as UpdateQuery<Partner>);
  }

  /** Modifie le taux de commission (0 à 100 %). */
  updateCommissionRate(id: string, rate: number): Promise<Partner> {
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new BadRequestException(
        'Le taux de commission doit être compris entre 0 et 100',
      );
    }
    return this.updateOrFail(id, { commission_rate: rate });
  }

  /** Modifie la limite de propriétés (≥ nombre déjà publiées). */
  async setMaxProperties(id: string, max: number): Promise<Partner> {
    if (!Number.isInteger(max) || max < 0 || max > 999) {
      throw new BadRequestException(
        'La limite doit être un entier entre 0 et 999',
      );
    }
    const partner = await this.findOne(id);
    const listed = partner.total_properties_listed ?? 0;
    if (max < listed) {
      throw new BadRequestException(
        `${listed} propriété(s) déjà publiée(s) : limite trop basse`,
      );
    }
    return this.updateOrFail(id, { max_properties: max });
  }

  /** Calcule la commission due sur un montant. */
  async calculateCommission(
    id: string,
    amount: number,
  ): Promise<CommissionResult> {
    this.assertAmount(amount);
    const partner = await this.findOne(id);
    const rate = partner.commission_rate ?? 0;
    return {
      amount,
      commission_rate: rate,
      commission: round((amount * rate) / 100),
    };
  }

  /** Enregistre une réservation apportée et la commission associée. */
  async recordBooking(id: string, amount: number): Promise<Partner> {
    this.assertAmount(amount);
    const partner = await this.findOne(id);
    this.assertActive(partner);
    const commission = round((amount * (partner.commission_rate ?? 0)) / 100);
    return this.updateOrFail(id, {
      $inc: { total_bookings: 1, total_commission_earned: commission },
    } as UpdateQuery<Partner>);
  }

  /** Rattache une propriété publiée par le partenaire (dans sa limite). */
  async addProperty(id: string, propertyId: string): Promise<Partner> {
    this.toObjectId(propertyId, 'property_id');
    const partner = await this.findOne(id);
    if (this.hasProperty(partner, propertyId)) {
      throw new ConflictException(
        'Cette propriété est déjà rattachée à ce partenaire',
      );
    }
    this.assertActive(partner);
    if ((partner.total_properties_listed ?? 0) >= partner.max_properties) {
      throw new BadRequestException(
        `Limite de ${partner.max_properties} propriété(s) atteinte`,
      );
    }
    return this.updateOrFail(id, {
      $addToSet: { property_ids: propertyId },
      $inc: { total_properties_listed: 1 },
    } as UpdateQuery<Partner>);
  }

  /** Détache une propriété du partenaire. */
  async removeProperty(id: string, propertyId: string): Promise<Partner> {
    this.toObjectId(propertyId, 'property_id');
    const partner = await this.findOne(id);
    if (!this.hasProperty(partner, propertyId)) {
      throw new NotFoundException(
        "Cette propriété n'est pas rattachée à ce partenaire",
      );
    }
    const update: Record<string, unknown> = {
      $pull: { property_ids: propertyId },
    };
    if ((partner.total_properties_listed ?? 0) > 0) {
      update.$inc = { total_properties_listed: -1 };
    }
    return this.updateOrFail(id, update as UpdateQuery<Partner>);
  }

  /** Ajoute un avis (0 à 5) et recalcule la note moyenne. */
  async addReview(id: string, rating: number): Promise<Partner> {
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      throw new BadRequestException('La note doit être comprise entre 0 et 5');
    }
    const partner = await this.findOne(id);
    const count = partner.total_reviews ?? 0;
    const average = ((partner.rating ?? 0) * count + rating) / (count + 1);
    return this.updateOrFail(id, {
      rating: round(average),
      total_reviews: count + 1,
    });
  }

  /** Statistiques globales (répartition par statut et par type). */
  async getStatistics(): Promise<PartnerStatistics> {
    type FacetResult = {
      totals: Array<{
        total: number;
        properties: number;
        commission: number;
        avg_rate: number;
      }>;
      by_status: Array<{ _id: string; count: number }>;
      by_type: Array<{ _id: string; count: number }>;
    };

    const [result] = await this.partnerModel
      .aggregate<FacetResult>([
        { $match: { is_deleted: { $ne: true } } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  properties: { $sum: '$total_properties_listed' },
                  commission: { $sum: '$total_commission_earned' },
                  avg_rate: { $avg: '$commission_rate' },
                },
              },
            ],
            by_status: [
              { $group: { _id: '$partner_status', count: { $sum: 1 } } },
            ],
            by_type: [{ $group: { _id: '$partner_type', count: { $sum: 1 } } }],
          },
        },
      ])
      .exec();

    const totals = result?.totals[0];
    const toRecord = (rows: Array<{ _id: string; count: number }> = []) =>
      Object.fromEntries(rows.map((row) => [row._id, row.count]));

    return {
      total: totals?.total ?? 0,
      by_status: toRecord(result?.by_status),
      by_type: toRecord(result?.by_type),
      total_properties_listed: totals?.properties ?? 0,
      total_commission_earned: round(totals?.commission ?? 0),
      avg_commission_rate: round(totals?.avg_rate ?? 0),
    };
  }

  // ========================
  // HELPERS
  // ========================

  private assertActive(partner: Partner): void {
    if (partner.partner_status !== PartnerStatus.ACTIVE) {
      throw new BadRequestException('Le partenaire doit être actif');
    }
  }

  private assertAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Le montant doit être un nombre positif');
    }
  }

  private requireReason(reason: string): string {
    const value = (reason ?? '').trim();
    if (!value) {
      throw new BadRequestException('Une raison est requise');
    }
    return value;
  }

  private hasProperty(partner: Partner, propertyId: string): boolean {
    return (partner.property_ids ?? []).some(
      (existing) => existing.toString() === propertyId,
    );
  }

  /** Lève une 409 si l'email est déjà utilisé par un autre partenaire. */
  private async ensureEmailAvailable(
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = { email };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    if (await this.repository.exists(filter as QueryFilter<Partner>)) {
      throw new ConflictException(`L'email ${email} est déjà utilisé`);
    }
  }

  private toObjectId(value: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${field} invalide`);
    }
    return new Types.ObjectId(value);
  }

  private buildSearchFilter(term: string): QueryFilter<Partner> {
    const regex = { $regex: escapeRegex(term.trim()), $options: 'i' };
    return {
      $or: [
        { company_name: regex },
        { contact_name: regex },
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { phone: regex },
      ],
    } as QueryFilter<Partner>;
  }

  private async updateOrFail(
    id: string,
    data: UpdateQuery<Partner>,
  ): Promise<Partner> {
    const doc = await this.repository.update(id, data);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  /** Retire les champs sensibles d'un document avant de le renvoyer. */
  private sanitize(doc: Partner): Partner {
    const source = doc as unknown as {
      toObject?: () => Record<string, unknown>;
    } & Record<string, unknown>;
    const plain =
      typeof source.toObject === 'function' ? source.toObject() : { ...source };
    delete plain.password_hash;
    delete plain.two_factor_secret;
    return plain as unknown as Partner;
  }
}

/** Arrondit à deux décimales. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Échappe les caractères spéciaux d'une expression régulière. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
