import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  Receptionist,
  ReceptionistDocument,
  ReceptionistShiftType,
  ReceptionistStatus,
  WEEK_DAYS,
  WeekDay,
} from '../schemas/receptionist.entity';
import { CreateReceptionistDto } from '../dto/create-receptionist.dto';
import { UpdateReceptionistDto } from '../dto/update-receptionist.dto';
import { SHIFT_TIME_REGEX, ShiftScheduleDto } from '../dto/shift-schedule.dto';
import { ReceptionistActivity } from '../dto/receptionist-actions.dto';

/** Nombre de tours de sel bcrypt utilisés pour hasher les mots de passe. */
const SALT_ROUNDS = 10;

/** Compteur incrémenté pour chaque type d'activité. */
const ACTIVITY_COUNTERS: Record<ReceptionistActivity, string> = {
  reservation: 'reservations_processed',
  checkin: 'total_checkins',
  checkout: 'total_checkouts',
  cancellation: 'total_cancellations',
};

/** Indicateurs de performance d'un réceptionniste. */
export interface ReceptionistPerformance {
  total_reservations: number;
  total_checkins: number;
  total_checkouts: number;
  total_cancellations: number;
  total_operations: number;
  cancellation_rate: number;
  avg_handling_time: number | null;
  satisfaction_score: number | null;
}

/**
 * Service de gestion des réceptionnistes.
 *
 * Étend le CRUD générique et ajoute : création avec hash du mot de passe,
 * recherche, rattachement à une propriété, statut (actif, congé, suspendu),
 * prise/fin de service, planning hebdomadaire, suivi d'activité
 * (réservations, check-in/out, annulations), satisfaction et contrôle des
 * remises autorisées.
 *
 * Le hash du mot de passe (`password_hash`, `select: false`) n'est jamais
 * renvoyé par ce service.
 */
@Injectable()
export class ReceptionistService extends BaseCrudService<
  Receptionist,
  CreateReceptionistDto,
  UpdateReceptionistDto
> {
  constructor(
    @InjectModel(Receptionist.name)
    protected readonly receptionistModel: Model<ReceptionistDocument>,
  ) {
    super(receptionistModel, Receptionist.name);
  }

  /** Crée un réceptionniste en hashant son mot de passe. */
  async create(
    createReceptionistDto: CreateReceptionistDto,
  ): Promise<Receptionist> {
    const { password, ...rest } = createReceptionistDto;
    const email = rest.email.toLowerCase().trim();
    if (rest.shift_schedule) {
      this.assertValidSchedule(rest.shift_schedule);
    }
    await this.ensureUnique({ email }, `L'email ${email} est déjà utilisé`);
    await this.ensureUnique(
      { employee_code: rest.employee_code },
      `Le code employé ${rest.employee_code} est déjà utilisé`,
    );

    const receptionist = new this.receptionistModel({
      ...rest,
      email,
      property_id: this.toObjectId(rest.property_id, 'property_id'),
      password_hash: await bcrypt.hash(password, SALT_ROUNDS),
      password_changed_at: new Date(),
    });

    const saved = await receptionist.save();
    return this.sanitize(saved as unknown as Receptionist);
  }

  /** Liste paginée, avec recherche libre optionnelle (`?search=`). */
  async findAll(
    query: PaginationQueryDto,
    filter: QueryFilter<Receptionist> = {},
  ): Promise<PaginatedResult<Receptionist>> {
    const searchFilter = query.search
      ? this.buildSearchFilter(query.search)
      : {};
    return super.findAll(query, {
      ...filter,
      ...searchFilter,
    } as QueryFilter<Receptionist>);
  }

  /** Met à jour un réceptionniste en vérifiant l'unicité et le planning. */
  async update(
    id: string,
    updateReceptionistDto: UpdateReceptionistDto,
  ): Promise<Receptionist> {
    if (updateReceptionistDto.shift_schedule) {
      this.assertValidSchedule(updateReceptionistDto.shift_schedule);
    }
    if (updateReceptionistDto.email) {
      updateReceptionistDto.email = updateReceptionistDto.email
        .toLowerCase()
        .trim();
      await this.ensureUnique(
        { email: updateReceptionistDto.email },
        `L'email ${updateReceptionistDto.email} est déjà utilisé`,
        id,
      );
    }
    if (updateReceptionistDto.employee_code) {
      await this.ensureUnique(
        { employee_code: updateReceptionistDto.employee_code },
        `Le code employé ${updateReceptionistDto.employee_code} est déjà utilisé`,
        id,
      );
    }
    return super.update(id, updateReceptionistDto);
  }

  /** Recherche un réceptionniste par email (insensible à la casse). */
  async findByEmail(email: string): Promise<Receptionist> {
    const receptionist = await this.repository.findOne({
      email: email.toLowerCase().trim(),
      is_deleted: { $ne: true },
    } as QueryFilter<Receptionist>);
    if (!receptionist) {
      throw new NotFoundException(
        `Receptionist avec l'email ${email} introuvable`,
      );
    }
    return receptionist;
  }

  /** Recherche un réceptionniste par code employé. */
  async findByEmployeeCode(employeeCode: string): Promise<Receptionist> {
    const receptionist = await this.repository.findOne({
      employee_code: employeeCode,
      is_deleted: { $ne: true },
    } as QueryFilter<Receptionist>);
    if (!receptionist) {
      throw new NotFoundException(
        `Receptionist avec le code ${employeeCode} introuvable`,
      );
    }
    return receptionist;
  }

  /** Recherche textuelle sur nom, prénom, email, téléphone et code employé. */
  async search(searchTerm: string): Promise<Receptionist[]> {
    if (!searchTerm || !searchTerm.trim()) {
      throw new BadRequestException('Le terme de recherche est requis');
    }
    return this.repository.find(
      {
        ...this.buildSearchFilter(searchTerm),
        is_deleted: { $ne: true },
      } as QueryFilter<Receptionist>,
      { sort: 'last_name', limit: 50 },
    );
  }

  /** Liste les réceptionnistes d'une propriété (filtrable par statut). */
  findByProperty(
    propertyId: string,
    query: PaginationQueryDto,
    status?: ReceptionistStatus,
  ): Promise<PaginatedResult<Receptionist>> {
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'propertyId'),
    };
    if (status) {
      this.assertStatus(status);
      filter.status = status;
    }
    return this.findAll(query, filter as QueryFilter<Receptionist>);
  }

  /** Liste les réceptionnistes actuellement en service. */
  findOnDuty(propertyId?: string): Promise<Receptionist[]> {
    const filter: Record<string, unknown> = {
      status: ReceptionistStatus.ACTIVE,
      last_shift_start: { $ne: null },
      last_shift_end: null,
      is_deleted: { $ne: true },
    };
    if (propertyId) {
      filter.property_id = this.toObjectId(propertyId, 'propertyId');
    }
    return this.repository.find(filter as QueryFilter<Receptionist>, {
      sort: 'last_shift_start',
    });
  }

  /** Liste les réceptionnistes planifiés un jour donné sur une propriété. */
  findScheduledOn(propertyId: string, day: string): Promise<Receptionist[]> {
    const weekDay = this.toWeekDay(day);
    return this.repository.find(
      {
        property_id: this.toObjectId(propertyId, 'propertyId'),
        status: ReceptionistStatus.ACTIVE,
        is_deleted: { $ne: true },
        [`shift_schedule.${weekDay}.start`]: { $exists: true, $ne: 'off' },
      } as QueryFilter<Receptionist>,
      { sort: `shift_schedule.${weekDay}.start` },
    );
  }

  /** Active le compte. */
  activate(id: string): Promise<Receptionist> {
    return this.updateOrFail(id, {
      is_active: true,
      status: ReceptionistStatus.ACTIVE,
    });
  }

  /** Désactive le compte. */
  deactivate(id: string): Promise<Receptionist> {
    return this.updateOrFail(id, {
      is_active: false,
      status: ReceptionistStatus.INACTIVE,
    });
  }

  /** Suspend un réceptionniste (le compte devient inactif). */
  async suspend(id: string, reason?: string): Promise<Receptionist> {
    const receptionist = await this.findOne(id);
    if (receptionist.status === ReceptionistStatus.SUSPENDED) {
      throw new BadRequestException('Ce réceptionniste est déjà suspendu');
    }
    return this.updateOrFail(id, {
      status: ReceptionistStatus.SUSPENDED,
      is_active: false,
      last_shift_end: receptionist.last_shift_end ?? new Date(),
      'metadata.suspension_reason': reason ?? null,
      'metadata.suspended_at': new Date(),
    } as UpdateQuery<Receptionist>);
  }

  /** Réactive un réceptionniste suspendu. */
  async reactivate(id: string): Promise<Receptionist> {
    const receptionist = await this.findOne(id);
    if (receptionist.status !== ReceptionistStatus.SUSPENDED) {
      throw new BadRequestException(
        'Seul un réceptionniste suspendu peut être réactivé',
      );
    }
    return this.updateOrFail(id, {
      status: ReceptionistStatus.ACTIVE,
      is_active: true,
      'metadata.suspension_reason': null,
      'metadata.reactivated_at': new Date(),
    } as UpdateQuery<Receptionist>);
  }

  /** Change le statut opérationnel (actif, congé, inactif, suspendu). */
  setStatus(id: string, status: ReceptionistStatus): Promise<Receptionist> {
    this.assertStatus(status);
    const update: Record<string, unknown> = {
      status,
      is_active:
        status === ReceptionistStatus.ACTIVE ||
        status === ReceptionistStatus.ON_LEAVE,
    };
    if (status !== ReceptionistStatus.ACTIVE) {
      // Un réceptionniste qui quitte le statut actif n'est plus en service.
      update.last_shift_end = new Date();
    }
    return this.updateOrFail(id, update as UpdateQuery<Receptionist>);
  }

  /** Change le mot de passe après vérification de l'ancien. */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<Receptionist> {
    const receptionist = await this.repository.findOne(
      { _id: id, is_deleted: { $ne: true } } as QueryFilter<Receptionist>,
      { select: '+password_hash' },
    );
    if (!receptionist) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    if (!(await bcrypt.compare(currentPassword, receptionist.password_hash))) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    if (await bcrypt.compare(newPassword, receptionist.password_hash)) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
    }
    return this.updateOrFail(id, {
      password_hash: await bcrypt.hash(newPassword, SALT_ROUNDS),
      password_changed_at: new Date(),
      failed_login_attempts: 0,
      locked_until: null,
    } as UpdateQuery<Receptionist>);
  }

  /** Démarre un service (shift) : le réceptionniste doit être actif. */
  async startShift(id: string): Promise<Receptionist> {
    const receptionist = await this.findOne(id);
    if (receptionist.status !== ReceptionistStatus.ACTIVE) {
      throw new BadRequestException(
        'Seul un réceptionniste actif peut prendre son service',
      );
    }
    if (this.isOnShift(receptionist)) {
      throw new BadRequestException('Le réceptionniste est déjà en service');
    }
    return this.updateOrFail(id, {
      last_shift_start: new Date(),
      last_shift_end: null,
    } as UpdateQuery<Receptionist>);
  }

  /** Termine le service en cours. */
  async endShift(id: string): Promise<Receptionist> {
    const receptionist = await this.findOne(id);
    if (!this.isOnShift(receptionist)) {
      throw new BadRequestException("Le réceptionniste n'est pas en service");
    }
    return this.updateOrFail(id, { last_shift_end: new Date() });
  }

  /** Remplace le planning hebdomadaire (et éventuellement le type de shift). */
  updateSchedule(
    id: string,
    schedule: ShiftScheduleDto,
    shiftType?: ReceptionistShiftType,
  ): Promise<Receptionist> {
    this.assertValidSchedule(schedule);
    const update: Record<string, unknown> = { shift_schedule: schedule };
    if (shiftType) {
      update.shift_type = shiftType;
    }
    return this.updateOrFail(id, update as UpdateQuery<Receptionist>);
  }

  /** Retourne le planning et la liste des jours travaillés. */
  async getSchedule(id: string): Promise<{
    shift_type?: ReceptionistShiftType;
    shift_schedule: Receptionist['shift_schedule'];
    working_days: WeekDay[];
  }> {
    const receptionist = await this.findOne(id);
    const schedule = receptionist.shift_schedule ?? {};
    return {
      shift_type: receptionist.shift_type,
      shift_schedule: schedule,
      working_days: WEEK_DAYS.filter((day) => {
        const slot = schedule[day];
        return !!slot && slot.start !== 'off';
      }),
    };
  }

  /**
   * Enregistre une activité (réservation, check-in, check-out, annulation) et
   * met à jour le temps moyen de traitement si une durée est fournie.
   */
  async recordActivity(
    id: string,
    type: ReceptionistActivity,
    handlingTime?: number,
  ): Promise<Receptionist> {
    const counter = ACTIVITY_COUNTERS[type];
    if (!counter) {
      throw new BadRequestException(`Type d'activité invalide : ${type}`);
    }
    if (handlingTime !== undefined && handlingTime < 0) {
      throw new BadRequestException(
        'La durée de traitement doit être positive',
      );
    }

    const receptionist = await this.findOne(id);
    if (receptionist.status !== ReceptionistStatus.ACTIVE) {
      throw new BadRequestException(
        'Le réceptionniste doit être actif pour enregistrer une activité',
      );
    }
    if (
      (type === 'checkin' || type === 'checkout') &&
      !receptionist.can_check_in_out
    ) {
      throw new ForbiddenException(
        "Ce réceptionniste n'est pas habilité aux check-in/check-out",
      );
    }

    const update: Record<string, unknown> = { $inc: { [counter]: 1 } };
    if (handlingTime !== undefined) {
      const handled = this.totalOperations(receptionist);
      const currentAvg = receptionist.avg_handling_time ?? 0;
      update.avg_handling_time =
        Math.round(
          ((currentAvg * handled + handlingTime) / (handled + 1)) * 100,
        ) / 100;
    }
    return this.updateOrFail(id, update as UpdateQuery<Receptionist>);
  }

  /** Intègre une nouvelle note de satisfaction (0 à 5). */
  async updateSatisfactionScore(
    id: string,
    score: number,
  ): Promise<Receptionist> {
    if (!Number.isFinite(score) || score < 0 || score > 5) {
      throw new BadRequestException('La note doit être comprise entre 0 et 5');
    }
    const receptionist = await this.findOne(id);
    const current = receptionist.satisfaction_score;
    const next =
      current === undefined || current === null ? score : (current + score) / 2;
    return this.updateOrFail(id, {
      satisfaction_score: Math.round(next * 100) / 100,
    });
  }

  /** Vérifie si une remise (en %) peut être accordée par ce réceptionniste. */
  async checkDiscount(
    id: string,
    percentage: number,
  ): Promise<{ allowed: boolean; max_discount_percent: number }> {
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new BadRequestException(
        'Le pourcentage de remise doit être compris entre 0 et 100',
      );
    }
    const receptionist = await this.findOne(id);
    const max = receptionist.max_discount_percent ?? 0;
    return {
      allowed:
        receptionist.status === ReceptionistStatus.ACTIVE &&
        (percentage <= max || receptionist.can_override_prices === true),
      max_discount_percent: max,
    };
  }

  /** Calcule les indicateurs de performance du réceptionniste. */
  async getPerformance(id: string): Promise<ReceptionistPerformance> {
    const receptionist = await this.findOne(id);
    const totalOperations = this.totalOperations(receptionist);
    const reservations = receptionist.reservations_processed ?? 0;
    const cancellations = receptionist.total_cancellations ?? 0;
    return {
      total_reservations: reservations,
      total_checkins: receptionist.total_checkins ?? 0,
      total_checkouts: receptionist.total_checkouts ?? 0,
      total_cancellations: cancellations,
      total_operations: totalOperations,
      cancellation_rate:
        reservations > 0
          ? Math.round((cancellations / reservations) * 10000) / 100
          : 0,
      avg_handling_time: receptionist.avg_handling_time ?? null,
      satisfaction_score: receptionist.satisfaction_score ?? null,
    };
  }

  // ========================
  // HELPERS
  // ========================

  private isOnShift(receptionist: Receptionist): boolean {
    return !!receptionist.last_shift_start && !receptionist.last_shift_end;
  }

  private totalOperations(receptionist: Receptionist): number {
    return (
      (receptionist.reservations_processed ?? 0) +
      (receptionist.total_checkins ?? 0) +
      (receptionist.total_checkouts ?? 0)
    );
  }

  /** Vérifie le format des créneaux (HH:mm ou off, début ≠ fin). */
  private assertValidSchedule(schedule: ShiftScheduleDto): void {
    for (const [day, slot] of Object.entries(schedule)) {
      if (!WEEK_DAYS.includes(day as WeekDay)) {
        throw new BadRequestException(`Jour invalide : ${day}`);
      }
      if (!slot) continue;
      const { start, end } = slot as { start: string; end: string };
      if (!SHIFT_TIME_REGEX.test(start) || !SHIFT_TIME_REGEX.test(end)) {
        throw new BadRequestException(
          `Horaires invalides pour ${day} (format HH:mm ou off)`,
        );
      }
      if (start !== 'off' && (end === 'off' || start === end)) {
        throw new BadRequestException(
          `Le créneau de ${day} doit avoir une heure de fin distincte`,
        );
      }
    }
  }

  private toWeekDay(day: string): WeekDay {
    const value = (day ?? '').toLowerCase() as WeekDay;
    if (!WEEK_DAYS.includes(value)) {
      throw new BadRequestException(`Jour invalide : ${day}`);
    }
    return value;
  }

  /** Lève une 409 si un autre réceptionniste correspond déjà au filtre. */
  private async ensureUnique(
    filter: Record<string, unknown>,
    message: string,
    excludeId?: string,
  ): Promise<void> {
    const query: Record<string, unknown> = { ...filter };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    if (await this.repository.exists(query as QueryFilter<Receptionist>)) {
      throw new ConflictException(message);
    }
  }

  private assertStatus(status: string): void {
    if (
      !Object.values(ReceptionistStatus).includes(status as ReceptionistStatus)
    ) {
      throw new BadRequestException(`Statut invalide : ${status}`);
    }
  }

  private toObjectId(value: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${field} invalide`);
    }
    return new Types.ObjectId(value);
  }

  private buildSearchFilter(term: string): QueryFilter<Receptionist> {
    const regex = { $regex: escapeRegex(term.trim()), $options: 'i' };
    return {
      $or: [
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { phone: regex },
        { employee_code: regex },
      ],
    } as QueryFilter<Receptionist>;
  }

  private async updateOrFail(
    id: string,
    data: UpdateQuery<Receptionist>,
  ): Promise<Receptionist> {
    const doc = await this.repository.update(id, data);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  /** Retire les champs sensibles d'un document avant de le renvoyer. */
  private sanitize(doc: Receptionist): Receptionist {
    const source = doc as unknown as {
      toObject?: () => Record<string, unknown>;
    } & Record<string, unknown>;
    const plain =
      typeof source.toObject === 'function' ? source.toObject() : { ...source };
    delete plain.password_hash;
    delete plain.two_factor_secret;
    return plain as unknown as Receptionist;
  }
}

/** Échappe les caractères spéciaux d'une expression régulière. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
