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
  Owner,
  OwnerDocument,
  OwnerStatus,
  OwnerSubscriptionPlan,
} from '../schemas/owner.entity';
import { CreateOwnerDto } from '../dto/create-owner.dto';
import { UpdateOwnerDto } from '../dto/update-owner.dto';
import { UpdateOwnerSubscriptionDto } from '../dto/owner-actions.dto';

/** Nombre de tours de sel bcrypt utilisés pour hasher les mots de passe. */
const SALT_ROUNDS = 10;

/** Âge minimal (en années) pour être propriétaire. */
const MIN_OWNER_AGE = 18;

/** Durée (en jours) de la période d'essai. */
const TRIAL_DAYS = 30;

/** Nombre de propriétés autorisées par plan d'abonnement. */
export const PLAN_PROPERTY_LIMITS: Record<OwnerSubscriptionPlan, number> = {
  [OwnerSubscriptionPlan.TRIAL]: 1,
  [OwnerSubscriptionPlan.BASIC]: 1,
  [OwnerSubscriptionPlan.PREMIUM]: 5,
  [OwnerSubscriptionPlan.PROFESSIONAL]: 20,
  [OwnerSubscriptionPlan.ENTERPRISE]: 999,
};

/** Synthèse de l'abonnement d'un propriétaire. */
export interface OwnerSubscriptionStatus {
  subscription_plan: OwnerSubscriptionPlan;
  subscription_expires_at: Date | null;
  is_valid: boolean;
  days_remaining: number | null;
  max_properties: number;
  properties_used: number;
  remaining_slots: number;
  can_add_property: boolean;
}

/** Complétude du dossier d'un propriétaire (aide à la validation). */
export interface OwnerProfileCompleteness {
  is_complete: boolean;
  missing_fields: string[];
  has_required_documents: boolean;
  missing_documents: string[];
}

const REQUIRED_PROFILE_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'country',
  'id_type',
  'id_number',
] as const;

/**
 * Service de gestion des propriétaires.
 *
 * Étend le CRUD générique et ajoute : création avec hash du mot de passe,
 * recherche, workflow de validation (vérification / rejet / suspension),
 * gestion des propriétés rattachées dans la limite de l'abonnement, gestion
 * de l'abonnement et suivi du chiffre d'affaires.
 *
 * Le hash du mot de passe (`password_hash`, `select: false`) n'est jamais
 * renvoyé par ce service.
 */
@Injectable()
export class OwnersService extends BaseCrudService<
  Owner,
  CreateOwnerDto,
  UpdateOwnerDto
> {
  constructor(
    @InjectModel(Owner.name)
    protected readonly ownerModel: Model<OwnerDocument>,
  ) {
    super(ownerModel, Owner.name);
  }

  /**
   * Crée un propriétaire (statut « en attente de vérification ») en hashant
   * son mot de passe et en appliquant les limites de son plan.
   */
  async create(createOwnerDto: CreateOwnerDto): Promise<Owner> {
    const { password, ...rest } = createOwnerDto;
    const email = rest.email.toLowerCase().trim();
    this.assertAdult(rest.birth_date);
    await this.ensureEmailAvailable(email);

    const plan = rest.subscription_plan ?? OwnerSubscriptionPlan.BASIC;
    const owner = new this.ownerModel({
      ...rest,
      email,
      subscription_plan: plan,
      max_properties: PLAN_PROPERTY_LIMITS[plan],
      subscription_expires_at:
        plan === OwnerSubscriptionPlan.TRIAL ? this.addDays(TRIAL_DAYS) : null,
      owner_status: OwnerStatus.PENDING_VERIFICATION,
      is_verified: false,
      password_hash: await bcrypt.hash(password, SALT_ROUNDS),
      password_changed_at: new Date(),
    });

    const saved = await owner.save();
    return this.sanitize(saved as unknown as Owner);
  }

  /** Liste paginée, avec recherche libre optionnelle (`?search=`). */
  async findAll(
    query: PaginationQueryDto,
    filter: QueryFilter<Owner> = {},
  ): Promise<PaginatedResult<Owner>> {
    const searchFilter = query.search
      ? this.buildSearchFilter(query.search)
      : {};
    return super.findAll(query, {
      ...filter,
      ...searchFilter,
    } as QueryFilter<Owner>);
  }

  /** Met à jour un propriétaire (unicité de l'email, âge minimal). */
  async update(id: string, updateOwnerDto: UpdateOwnerDto): Promise<Owner> {
    this.assertAdult(updateOwnerDto.birth_date);
    if (updateOwnerDto.email) {
      updateOwnerDto.email = updateOwnerDto.email.toLowerCase().trim();
      await this.ensureEmailAvailable(updateOwnerDto.email, id);
    }
    return super.update(id, updateOwnerDto);
  }

  /** Recherche un propriétaire par email (insensible à la casse). */
  async findByEmail(email: string): Promise<Owner> {
    const owner = await this.repository.findOne({
      email: email.toLowerCase().trim(),
      is_deleted: { $ne: true },
    } as QueryFilter<Owner>);
    if (!owner) {
      throw new NotFoundException(`Owner avec l'email ${email} introuvable`);
    }
    return owner;
  }

  /** Recherche textuelle (nom, email, téléphone, société, ville). */
  async search(searchTerm: string): Promise<Owner[]> {
    if (!searchTerm || !searchTerm.trim()) {
      throw new BadRequestException('Le terme de recherche est requis');
    }
    return this.repository.find(
      {
        ...this.buildSearchFilter(searchTerm),
        is_deleted: { $ne: true },
      } as QueryFilter<Owner>,
      { sort: 'last_name', limit: 50 },
    );
  }

  /** Liste les propriétaires d'un statut donné. */
  findByStatus(
    status: OwnerStatus,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Owner>> {
    if (!Object.values(OwnerStatus).includes(status)) {
      throw new BadRequestException(`Statut invalide : ${status}`);
    }
    return this.findAll(query, { owner_status: status } as QueryFilter<Owner>);
  }

  /** Liste les dossiers en attente de validation (les plus anciens d'abord). */
  findPendingVerification(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Owner>> {
    return this.findAll({ ...query, sort: query.sort ?? 'created_at' }, {
      owner_status: OwnerStatus.PENDING_VERIFICATION,
    } as QueryFilter<Owner>);
  }

  /** Retrouve le propriétaire d'une propriété. */
  async findByProperty(propertyId: string): Promise<Owner> {
    const owner = await this.repository.findOne({
      property_ids: this.toObjectId(propertyId, 'propertyId'),
      is_deleted: { $ne: true },
    } as QueryFilter<Owner>);
    if (!owner) {
      throw new NotFoundException(
        `Aucun propriétaire pour la propriété ${propertyId}`,
      );
    }
    return owner;
  }

  /** Liste les propriétaires dont l'abonnement expire dans les X jours. */
  findExpiringSubscriptions(days = 30): Promise<Owner[]> {
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new BadRequestException(
        'Le nombre de jours doit être compris entre 1 et 365',
      );
    }
    return this.repository.find(
      {
        owner_status: OwnerStatus.ACTIVE,
        is_deleted: { $ne: true },
        subscription_expires_at: { $gte: new Date(), $lte: this.addDays(days) },
      } as QueryFilter<Owner>,
      { sort: 'subscription_expires_at' },
    );
  }

  /**
   * Valide le dossier d'un propriétaire (cahier des charges : « Valider
   * propriétaires »). Le dossier doit être en attente et contenir les
   * documents requis (pièce d'identité + contrat ou licence commerciale).
   */
  async verify(id: string, verifiedBy?: string): Promise<Owner> {
    const owner = await this.findOne(id);
    if (owner.owner_status !== OwnerStatus.PENDING_VERIFICATION) {
      throw new BadRequestException(
        'Seul un propriétaire en attente de vérification peut être validé',
      );
    }
    const { missing_documents } = this.computeCompleteness(owner);
    if (missing_documents.length > 0) {
      throw new BadRequestException(
        `Documents manquants : ${missing_documents.join(', ')}`,
      );
    }

    const update: Record<string, unknown> = {
      owner_status: OwnerStatus.ACTIVE,
      is_verified: true,
      is_active: true,
      verified_at: new Date(),
      'metadata.rejection_reason': null,
    };
    if (verifiedBy) {
      update.verified_by = this.toObjectId(verifiedBy, 'verified_by');
    }
    return this.updateOrFail(id, update as UpdateQuery<Owner>);
  }

  /** Rejette un dossier en attente (le compte devient inactif). */
  async reject(id: string, reason: string): Promise<Owner> {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('La raison du rejet est requise');
    }
    const owner = await this.findOne(id);
    if (owner.owner_status !== OwnerStatus.PENDING_VERIFICATION) {
      throw new BadRequestException(
        'Seul un propriétaire en attente de vérification peut être rejeté',
      );
    }
    return this.updateOrFail(id, {
      owner_status: OwnerStatus.INACTIVE,
      is_active: false,
      is_verified: false,
      'metadata.rejection_reason': reason.trim(),
      'metadata.rejected_at': new Date(),
    } as UpdateQuery<Owner>);
  }

  /** Suspend un propriétaire actif. */
  async suspend(id: string, reason?: string): Promise<Owner> {
    const owner = await this.findOne(id);
    if (owner.owner_status !== OwnerStatus.ACTIVE) {
      throw new BadRequestException(
        'Seul un propriétaire actif peut être suspendu',
      );
    }
    return this.updateOrFail(id, {
      owner_status: OwnerStatus.SUSPENDED,
      is_active: false,
      'metadata.suspension_reason': reason ?? null,
      'metadata.suspended_at': new Date(),
    } as UpdateQuery<Owner>);
  }

  /**
   * Réactive un propriétaire suspendu : il redevient actif s'il était
   * vérifié, sinon il repasse en attente de vérification.
   */
  async reactivate(id: string): Promise<Owner> {
    const owner = await this.findOne(id);
    if (owner.owner_status !== OwnerStatus.SUSPENDED) {
      throw new BadRequestException(
        'Seul un propriétaire suspendu peut être réactivé',
      );
    }
    return this.updateOrFail(id, {
      owner_status: owner.is_verified
        ? OwnerStatus.ACTIVE
        : OwnerStatus.PENDING_VERIFICATION,
      is_active: true,
      'metadata.suspension_reason': null,
      'metadata.reactivated_at': new Date(),
    } as UpdateQuery<Owner>);
  }

  /** Active le compte d'un propriétaire déjà vérifié. */
  async activate(id: string): Promise<Owner> {
    const owner = await this.findOne(id);
    if (!owner.is_verified) {
      throw new BadRequestException(
        'Le propriétaire doit être vérifié avant activation',
      );
    }
    return this.updateOrFail(id, {
      is_active: true,
      owner_status: OwnerStatus.ACTIVE,
    });
  }

  /** Désactive le compte. */
  deactivate(id: string): Promise<Owner> {
    return this.updateOrFail(id, {
      is_active: false,
      owner_status: OwnerStatus.INACTIVE,
    });
  }

  /** Change le mot de passe après vérification de l'ancien. */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<Owner> {
    const owner = await this.repository.findOne(
      { _id: id, is_deleted: { $ne: true } } as QueryFilter<Owner>,
      { select: '+password_hash' },
    );
    if (!owner) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    if (!(await bcrypt.compare(currentPassword, owner.password_hash))) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    if (await bcrypt.compare(newPassword, owner.password_hash)) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
    }
    return this.updateOrFail(id, {
      password_hash: await bcrypt.hash(newPassword, SALT_ROUNDS),
      password_changed_at: new Date(),
      failed_login_attempts: 0,
      locked_until: null,
    } as UpdateQuery<Owner>);
  }

  /**
   * Rattache une propriété : le propriétaire doit être actif, avoir un
   * abonnement valide et ne pas avoir atteint sa limite de propriétés.
   */
  async addProperty(id: string, propertyId: string): Promise<Owner> {
    const propertyObjectId = this.toObjectId(propertyId, 'property_id');
    const owner = await this.findOne(id);

    if (this.hasProperty(owner, propertyId)) {
      throw new ConflictException(
        'Cette propriété est déjà rattachée à ce propriétaire',
      );
    }
    if (owner.owner_status !== OwnerStatus.ACTIVE || !owner.is_active) {
      throw new BadRequestException(
        'Le propriétaire doit être actif pour ajouter une propriété',
      );
    }
    if (!this.isSubscriptionValid(owner)) {
      throw new BadRequestException("L'abonnement du propriétaire a expiré");
    }
    if ((owner.total_properties_created ?? 0) >= owner.max_properties) {
      throw new BadRequestException(
        `Limite de ${owner.max_properties} propriété(s) atteinte pour ce plan`,
      );
    }

    return this.updateOrFail(id, {
      $addToSet: { property_ids: propertyObjectId },
      $inc: { total_properties_created: 1 },
      $set: { last_activity_date: new Date() },
    } as UpdateQuery<Owner>);
  }

  /** Détache une propriété du propriétaire. */
  async removeProperty(id: string, propertyId: string): Promise<Owner> {
    const propertyObjectId = this.toObjectId(propertyId, 'property_id');
    const owner = await this.findOne(id);
    if (!this.hasProperty(owner, propertyId)) {
      throw new NotFoundException(
        "Cette propriété n'est pas rattachée à ce propriétaire",
      );
    }
    const update: Record<string, unknown> = {
      $pull: { property_ids: propertyObjectId },
      $set: { last_activity_date: new Date() },
    };
    if ((owner.total_properties_created ?? 0) > 0) {
      update.$inc = { total_properties_created: -1 };
    }
    return this.updateOrFail(id, update as UpdateQuery<Owner>);
  }

  /**
   * Change de plan d'abonnement. La limite de propriétés suit le plan (sauf
   * surcharge) et ne peut pas être inférieure au nombre déjà rattaché.
   */
  async updateSubscription(
    id: string,
    dto: UpdateOwnerSubscriptionDto,
  ): Promise<Owner> {
    const plan = dto.subscription_plan;
    if (!Object.values(OwnerSubscriptionPlan).includes(plan)) {
      throw new BadRequestException(`Plan invalide : ${plan}`);
    }

    let expiresAt: Date | null = null;
    if (dto.subscription_expires_at) {
      expiresAt = new Date(dto.subscription_expires_at);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        throw new BadRequestException(
          "La date d'expiration doit être dans le futur",
        );
      }
    } else if (plan === OwnerSubscriptionPlan.TRIAL) {
      expiresAt = this.addDays(TRIAL_DAYS);
    }

    const owner = await this.findOne(id);
    const maxProperties = dto.max_properties ?? PLAN_PROPERTY_LIMITS[plan];
    const used = owner.total_properties_created ?? 0;
    if (maxProperties < used) {
      throw new BadRequestException(
        `Le plan autorise ${maxProperties} propriété(s) mais ${used} sont déjà rattachées`,
      );
    }

    return this.updateOrFail(id, {
      subscription_plan: plan,
      subscription_expires_at: expiresAt,
      max_properties: maxProperties,
    } as UpdateQuery<Owner>);
  }

  /** Retourne une synthèse de l'abonnement et des emplacements restants. */
  async getSubscriptionStatus(id: string): Promise<OwnerSubscriptionStatus> {
    const owner = await this.findOne(id);
    const used = owner.total_properties_created ?? 0;
    const expiresAt = owner.subscription_expires_at ?? null;
    const isValid = this.isSubscriptionValid(owner);
    const remaining = Math.max(0, owner.max_properties - used);

    return {
      subscription_plan: owner.subscription_plan,
      subscription_expires_at: expiresAt,
      is_valid: isValid,
      days_remaining: expiresAt
        ? Math.max(
            0,
            Math.ceil(
              (new Date(expiresAt).getTime() - Date.now()) / 86_400_000,
            ),
          )
        : null,
      max_properties: owner.max_properties,
      properties_used: used,
      remaining_slots: remaining,
      can_add_property:
        owner.owner_status === OwnerStatus.ACTIVE &&
        owner.is_active !== false &&
        isValid &&
        remaining > 0,
    };
  }

  /** Indique les champs et documents manquants du dossier. */
  async getProfileCompleteness(id: string): Promise<OwnerProfileCompleteness> {
    const owner = await this.findOne(id);
    return this.computeCompleteness(owner);
  }

  /** Ajoute un montant au chiffre d'affaires cumulé. */
  addRevenue(id: string, amount: number): Promise<Owner> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Le montant doit être strictement positif');
    }
    return this.updateOrFail(id, {
      $inc: { total_revenue: amount },
      $set: { last_activity_date: new Date() },
    } as UpdateQuery<Owner>);
  }

  // ========================
  // HELPERS
  // ========================

  private computeCompleteness(owner: Owner): OwnerProfileCompleteness {
    const source = owner as unknown as Record<string, unknown>;
    const missingFields = REQUIRED_PROFILE_FIELDS.filter(
      (field) => !source[field],
    );
    const missingDocuments: string[] = [];
    if (!owner.id_document_url) {
      missingDocuments.push('id_document_url');
    }
    if (!owner.contract_document_url && !owner.business_license_url) {
      missingDocuments.push('contract_document_url|business_license_url');
    }
    return {
      is_complete: missingFields.length === 0,
      missing_fields: [...missingFields],
      has_required_documents: missingDocuments.length === 0,
      missing_documents: missingDocuments,
    };
  }

  private hasProperty(owner: Owner, propertyId: string): boolean {
    return (owner.property_ids ?? []).some(
      (existing) => existing.toString() === propertyId,
    );
  }

  private isSubscriptionValid(owner: Owner): boolean {
    return (
      !owner.subscription_expires_at ||
      new Date(owner.subscription_expires_at) > new Date()
    );
  }

  /** Vérifie que la date de naissance correspond à un adulte. */
  private assertAdult(birthDate?: string): void {
    if (!birthDate) return;
    const date = new Date(birthDate);
    if (Number.isNaN(date.getTime()) || date > new Date()) {
      throw new BadRequestException('Date de naissance invalide');
    }
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - MIN_OWNER_AGE);
    if (date > limit) {
      throw new BadRequestException(
        `Le propriétaire doit avoir au moins ${MIN_OWNER_AGE} ans`,
      );
    }
  }

  private addDays(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /** Lève une 409 si l'email est déjà utilisé par un autre propriétaire. */
  private async ensureEmailAvailable(
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = { email };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    if (await this.repository.exists(filter as QueryFilter<Owner>)) {
      throw new ConflictException(`L'email ${email} est déjà utilisé`);
    }
  }

  private toObjectId(value: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${field} invalide`);
    }
    return new Types.ObjectId(value);
  }

  private buildSearchFilter(term: string): QueryFilter<Owner> {
    const regex = { $regex: escapeRegex(term.trim()), $options: 'i' };
    return {
      $or: [
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { phone: regex },
        { company_name: regex },
        { city: regex },
      ],
    } as QueryFilter<Owner>;
  }

  private async updateOrFail(
    id: string,
    data: UpdateQuery<Owner>,
  ): Promise<Owner> {
    const doc = await this.repository.update(id, data);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  /** Retire les champs sensibles d'un document avant de le renvoyer. */
  private sanitize(doc: Owner): Owner {
    const source = doc as unknown as {
      toObject?: () => Record<string, unknown>;
    } & Record<string, unknown>;
    const plain =
      typeof source.toObject === 'function' ? source.toObject() : { ...source };
    delete plain.password_hash;
    delete plain.two_factor_secret;
    return plain as unknown as Owner;
  }
}

/** Échappe les caractères spéciaux d'une expression régulière. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
