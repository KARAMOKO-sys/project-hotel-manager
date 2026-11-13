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
  HousekeepingStaff,
  HousekeepingStaffDocument,
  HousekeepingStatus,
  SpecializationType,
} from '../schemas/housekeeping-staff.entity';
import {
  CreateHousekeepingStaffDto,
  HOUR_REGEX,
  WORKING_DAYS,
} from '../dto/create-housekeeping-staff.dto';
import { UpdateHousekeepingStaffDto } from '../dto/update-housekeeping-staff.dto';
import {
  RecordCleaningDto,
  ReportIssueDto,
  UpdateHousekeepingScheduleDto,
} from '../dto/housekeeping-staff-actions.dto';

/** Nombre de tours de sel bcrypt utilisés pour hasher les mots de passe. */
const SALT_ROUNDS = 10;

/** Nombre maximal d'entrées conservées dans l'historique de nettoyage. */
const MAX_CLEANING_HISTORY = 500;

/** Nombre maximal de signalements conservés dans les métadonnées. */
const MAX_ISSUE_REPORTS = 100;

/** Statuts permettant d'effectuer des tâches de ménage. */
const WORKING_STATUSES: HousekeepingStatus[] = [
  HousekeepingStatus.ACTIVE,
  HousekeepingStatus.TRAINING,
];

/** Charge de travail d'un membre du personnel. */
export interface HousekeepingWorkload {
  rooms_cleaned_today: number;
  today_tasks: Array<{ room_number: string; time: number; quality: number }>;
  monthly_target: number;
  monthly_completed: number;
  monthly_remaining: number;
  monthly_progress: number;
}

/** Indicateurs de performance d'un membre du personnel. */
export interface HousekeepingPerformance {
  total_rooms: number;
  total_tasks: number;
  avg_cleaning_time: number | null;
  quality_score: number | null;
  total_issue_reports: number;
  issue_rate: number;
  attendance_rate: number | null;
  monthly_progress: number;
}

/**
 * Service de gestion du personnel de ménage.
 *
 * Étend le CRUD générique et ajoute : création avec hash du mot de passe,
 * recherche, rattachement à une propriété, statut (congé, maladie,
 * formation...), horaires, disponibilité en temps réel, enregistrement des
 * nettoyages, signalement de problèmes, objectifs mensuels et indicateurs de
 * charge de travail / performance.
 *
 * Le hash du mot de passe (`password_hash`, `select: false`) n'est jamais
 * renvoyé par ce service.
 */
@Injectable()
export class HousekeepingStaffService extends BaseCrudService<
  HousekeepingStaff,
  CreateHousekeepingStaffDto,
  UpdateHousekeepingStaffDto
> {
  constructor(
    @InjectModel(HousekeepingStaff.name)
    protected readonly housekeepingStaffModel: Model<HousekeepingStaffDocument>,
  ) {
    super(housekeepingStaffModel, HousekeepingStaff.name);
  }

  /** Crée un membre du personnel en hashant son mot de passe. */
  async create(dto: CreateHousekeepingStaffDto): Promise<HousekeepingStaff> {
    const { password, ...rest } = dto;
    const email = rest.email.toLowerCase().trim();
    this.assertShiftHours(rest.shift_start, rest.shift_end);
    await this.ensureUnique({ email }, `L'email ${email} est déjà utilisé`);
    await this.ensureUnique(
      { employee_code: rest.employee_code },
      `Le code employé ${rest.employee_code} est déjà utilisé`,
    );

    const staff = new this.housekeepingStaffModel({
      ...rest,
      email,
      property_id: this.toObjectId(rest.property_id, 'property_id'),
      password_hash: await bcrypt.hash(password, SALT_ROUNDS),
      password_changed_at: new Date(),
    });

    const saved = await staff.save();
    return this.sanitize(saved as unknown as HousekeepingStaff);
  }

  /** Liste paginée, avec recherche libre optionnelle (`?search=`). */
  async findAll(
    query: PaginationQueryDto,
    filter: QueryFilter<HousekeepingStaff> = {},
  ): Promise<PaginatedResult<HousekeepingStaff>> {
    const searchFilter = query.search
      ? this.buildSearchFilter(query.search)
      : {};
    return super.findAll(query, {
      ...filter,
      ...searchFilter,
    } as QueryFilter<HousekeepingStaff>);
  }

  /** Met à jour un membre du personnel (unicité email / code employé). */
  async update(
    id: string,
    dto: UpdateHousekeepingStaffDto,
  ): Promise<HousekeepingStaff> {
    this.assertShiftHours(dto.shift_start, dto.shift_end);
    if (dto.email) {
      dto.email = dto.email.toLowerCase().trim();
      await this.ensureUnique(
        { email: dto.email },
        `L'email ${dto.email} est déjà utilisé`,
        id,
      );
    }
    if (dto.employee_code) {
      await this.ensureUnique(
        { employee_code: dto.employee_code },
        `Le code employé ${dto.employee_code} est déjà utilisé`,
        id,
      );
    }
    return super.update(id, dto);
  }

  /** Recherche un membre du personnel par email. */
  async findByEmail(email: string): Promise<HousekeepingStaff> {
    const staff = await this.repository.findOne({
      email: email.toLowerCase().trim(),
      is_deleted: { $ne: true },
    } as QueryFilter<HousekeepingStaff>);
    if (!staff) {
      throw new NotFoundException(
        `HousekeepingStaff avec l'email ${email} introuvable`,
      );
    }
    return staff;
  }

  /** Recherche un membre du personnel par code employé. */
  async findByEmployeeCode(employeeCode: string): Promise<HousekeepingStaff> {
    const staff = await this.repository.findOne({
      employee_code: employeeCode,
      is_deleted: { $ne: true },
    } as QueryFilter<HousekeepingStaff>);
    if (!staff) {
      throw new NotFoundException(
        `HousekeepingStaff avec le code ${employeeCode} introuvable`,
      );
    }
    return staff;
  }

  /** Recherche textuelle sur nom, prénom, email, téléphone et code employé. */
  async search(searchTerm: string): Promise<HousekeepingStaff[]> {
    if (!searchTerm || !searchTerm.trim()) {
      throw new BadRequestException('Le terme de recherche est requis');
    }
    return this.repository.find(
      {
        ...this.buildSearchFilter(searchTerm),
        is_deleted: { $ne: true },
      } as QueryFilter<HousekeepingStaff>,
      { sort: 'last_name', limit: 50 },
    );
  }

  /** Liste le personnel d'une propriété (filtrable par statut). */
  findByProperty(
    propertyId: string,
    query: PaginationQueryDto,
    status?: HousekeepingStatus,
  ): Promise<PaginatedResult<HousekeepingStaff>> {
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'propertyId'),
    };
    if (status) {
      this.assertStatus(status);
      filter.status = status;
    }
    return this.findAll(query, filter as QueryFilter<HousekeepingStaff>);
  }

  /** Liste le personnel actif ayant une spécialisation donnée. */
  findBySpecialization(
    specialization: SpecializationType,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<HousekeepingStaff>> {
    if (!Object.values(SpecializationType).includes(specialization)) {
      throw new BadRequestException(
        `Spécialisation invalide : ${specialization}`,
      );
    }
    return this.findAll(query, {
      specialization,
      status: HousekeepingStatus.ACTIVE,
    } as QueryFilter<HousekeepingStaff>);
  }

  /**
   * Liste le personnel disponible à un instant donné sur une propriété :
   * actif, jour travaillé et heure comprise dans le créneau (créneaux de nuit
   * à cheval sur minuit gérés). Triés par charge du jour croissante pour
   * faciliter l'affectation des tâches.
   */
  findAvailable(
    propertyId: string,
    at: Date = new Date(),
  ): Promise<HousekeepingStaff[]> {
    if (Number.isNaN(at.getTime())) {
      throw new BadRequestException('Date invalide');
    }
    const time = at.toTimeString().slice(0, 5);
    const day = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ][at.getDay()];

    return this.repository.find(
      {
        property_id: this.toObjectId(propertyId, 'propertyId'),
        status: HousekeepingStatus.ACTIVE,
        is_deleted: { $ne: true },
        working_days: day,
        $or: [
          { shift_start: { $lte: time }, shift_end: { $gte: time } },
          {
            $expr: { $gt: ['$shift_start', '$shift_end'] },
            $or: [
              { shift_start: { $lte: time } },
              { shift_end: { $gte: time } },
            ],
          },
        ],
      } as QueryFilter<HousekeepingStaff>,
      { sort: 'rooms_cleaned_today' },
    );
  }

  /** Active le compte. */
  activate(id: string): Promise<HousekeepingStaff> {
    return this.updateOrFail(id, {
      is_active: true,
      status: HousekeepingStatus.ACTIVE,
    });
  }

  /** Désactive le compte. */
  deactivate(id: string): Promise<HousekeepingStaff> {
    return this.updateOrFail(id, {
      is_active: false,
      status: HousekeepingStatus.INACTIVE,
    });
  }

  /** Suspend un membre du personnel. */
  async suspend(id: string, reason?: string): Promise<HousekeepingStaff> {
    const staff = await this.findOne(id);
    if (staff.status === HousekeepingStatus.SUSPENDED) {
      throw new BadRequestException('Ce membre du personnel est déjà suspendu');
    }
    return this.updateOrFail(id, {
      status: HousekeepingStatus.SUSPENDED,
      is_active: false,
      'metadata.suspension_reason': reason ?? null,
      'metadata.suspended_at': new Date(),
    } as UpdateQuery<HousekeepingStaff>);
  }

  /** Réactive un membre du personnel suspendu. */
  async reactivate(id: string): Promise<HousekeepingStaff> {
    const staff = await this.findOne(id);
    if (staff.status !== HousekeepingStatus.SUSPENDED) {
      throw new BadRequestException(
        'Seul un membre du personnel suspendu peut être réactivé',
      );
    }
    return this.updateOrFail(id, {
      status: HousekeepingStatus.ACTIVE,
      is_active: true,
      'metadata.suspension_reason': null,
      'metadata.reactivated_at': new Date(),
    } as UpdateQuery<HousekeepingStaff>);
  }

  /** Change le statut opérationnel (congé, maladie, formation...). */
  setStatus(
    id: string,
    status: HousekeepingStatus,
  ): Promise<HousekeepingStaff> {
    this.assertStatus(status);
    return this.updateOrFail(id, {
      status,
      is_active:
        status !== HousekeepingStatus.INACTIVE &&
        status !== HousekeepingStatus.SUSPENDED,
    });
  }

  /** Change le mot de passe après vérification de l'ancien. */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<HousekeepingStaff> {
    const staff = await this.repository.findOne(
      { _id: id, is_deleted: { $ne: true } } as QueryFilter<HousekeepingStaff>,
      { select: '+password_hash' },
    );
    if (!staff) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    if (!(await bcrypt.compare(currentPassword, staff.password_hash))) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    if (await bcrypt.compare(newPassword, staff.password_hash)) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
    }
    return this.updateOrFail(id, {
      password_hash: await bcrypt.hash(newPassword, SALT_ROUNDS),
      password_changed_at: new Date(),
      failed_login_attempts: 0,
      locked_until: null,
    } as UpdateQuery<HousekeepingStaff>);
  }

  /** Met à jour les horaires, jours travaillés et type de shift. */
  updateSchedule(
    id: string,
    schedule: UpdateHousekeepingScheduleDto,
  ): Promise<HousekeepingStaff> {
    this.assertShiftHours(schedule.shift_start, schedule.shift_end, true);
    if (schedule.working_days) {
      const invalid = schedule.working_days.filter(
        (day) => !(WORKING_DAYS as readonly string[]).includes(day),
      );
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Jours invalides : ${invalid.join(', ')}`,
        );
      }
    }
    const update = Object.fromEntries(
      Object.entries(schedule).filter(([, value]) => value !== undefined),
    );
    return this.updateOrFail(id, update as UpdateQuery<HousekeepingStaff>);
  }

  /**
   * Enregistre le nettoyage d'une chambre : historique, compteurs, temps
   * moyen et note qualité moyenne.
   */
  async recordCleaning(
    id: string,
    record: RecordCleaningDto,
  ): Promise<HousekeepingStaff> {
    if (!Number.isFinite(record.cleaning_time) || record.cleaning_time <= 0) {
      throw new BadRequestException('La durée de nettoyage doit être positive');
    }
    if (
      record.quality_score !== undefined &&
      (record.quality_score < 0 || record.quality_score > 5)
    ) {
      throw new BadRequestException(
        'La note qualité doit être comprise entre 0 et 5',
      );
    }
    const roomId = this.toObjectId(record.room_id, 'room_id');

    const staff = await this.findOne(id);
    this.assertCanWork(staff);

    const done = staff.rooms_cleaned_total ?? 0;
    const avgTime =
      ((staff.avg_cleaning_time ?? 0) * done + record.cleaning_time) /
      (done + 1);

    const set: Record<string, unknown> = {
      avg_cleaning_time: round(avgTime),
    };
    if (record.quality_score !== undefined) {
      const previous = staff.quality_score;
      set.quality_score = round(
        previous === undefined || previous === null || done === 0
          ? record.quality_score
          : (previous * done + record.quality_score) / (done + 1),
      );
    }

    const inc: Record<string, number> = {
      rooms_cleaned_today: 1,
      rooms_cleaned_total: 1,
      total_tasks_completed: 1,
      monthly_completed: 1,
    };
    if (record.issue_reported) {
      inc.total_issue_reports = 1;
    }

    return this.updateOrFail(id, {
      $set: set,
      $inc: inc,
      $push: {
        cleaning_history: {
          $each: [
            {
              date: new Date(),
              room_id: roomId,
              room_number: record.room_number,
              cleaning_time: record.cleaning_time,
              quality_score: record.quality_score ?? null,
              issue_reported: record.issue_reported ?? false,
              notes: record.notes,
            },
          ],
          $slice: -MAX_CLEANING_HISTORY,
        },
      },
    } as UpdateQuery<HousekeepingStaff>);
  }

  /** Signale un problème constaté dans une chambre. */
  async reportIssue(
    id: string,
    issue: ReportIssueDto,
  ): Promise<HousekeepingStaff> {
    const roomId = this.toObjectId(issue.room_id, 'room_id');
    if (!issue.issue_type?.trim() || !issue.description?.trim()) {
      throw new BadRequestException(
        'Le type et la description du problème sont requis',
      );
    }
    const staff = await this.findOne(id);
    this.assertCanWork(staff);

    return this.updateOrFail(id, {
      $inc: { total_issue_reports: 1 },
      $push: {
        'metadata.issue_reports': {
          $each: [
            {
              date: new Date(),
              room_id: roomId,
              room_number: issue.room_number,
              issue_type: issue.issue_type.trim(),
              description: issue.description.trim(),
            },
          ],
          $slice: -MAX_ISSUE_REPORTS,
        },
      },
    } as UpdateQuery<HousekeepingStaff>);
  }

  /** Définit l'objectif mensuel de chambres nettoyées. */
  setMonthlyTarget(id: string, target: number): Promise<HousekeepingStaff> {
    if (!Number.isInteger(target) || target < 0) {
      throw new BadRequestException(
        "L'objectif mensuel doit être un entier positif",
      );
    }
    return this.updateOrFail(id, { monthly_target: target });
  }

  /** Affecte un superviseur (différent du membre lui-même). */
  assignSupervisor(
    id: string,
    supervisorId: string,
    supervisorName?: string,
  ): Promise<HousekeepingStaff> {
    if (supervisorId === id) {
      throw new BadRequestException(
        'Un membre du personnel ne peut pas être son propre superviseur',
      );
    }
    const update: Record<string, unknown> = {
      supervisor_id: this.toObjectId(supervisorId, 'supervisor_id'),
    };
    if (supervisorName) {
      update.supervisor_name = supervisorName;
    }
    return this.updateOrFail(id, update as UpdateQuery<HousekeepingStaff>);
  }

  /** Remet à zéro les compteurs journaliers d'une propriété (fin de journée). */
  async resetDailyCounters(propertyId: string): Promise<{ modified: number }> {
    const result = await this.housekeepingStaffModel
      .updateMany(
        { property_id: this.toObjectId(propertyId, 'propertyId') },
        { $set: { rooms_cleaned_today: 0 } },
      )
      .exec();
    return { modified: result.modifiedCount };
  }

  /** Remet à zéro les compteurs mensuels d'une propriété (début de mois). */
  async resetMonthlyCounters(
    propertyId: string,
  ): Promise<{ modified: number }> {
    const result = await this.housekeepingStaffModel
      .updateMany(
        { property_id: this.toObjectId(propertyId, 'propertyId') },
        { $set: { monthly_completed: 0 } },
      )
      .exec();
    return { modified: result.modifiedCount };
  }

  /** Retourne la charge de travail du jour et l'avancement mensuel. */
  async getWorkload(id: string): Promise<HousekeepingWorkload> {
    const staff = await this.findOne(id);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const target = staff.monthly_target ?? 0;
    const completed = staff.monthly_completed ?? 0;

    return {
      rooms_cleaned_today: staff.rooms_cleaned_today ?? 0,
      today_tasks: (staff.cleaning_history ?? [])
        .filter((entry) => new Date(entry.date) >= startOfDay)
        .map((entry) => ({
          room_number: entry.room_number,
          time: entry.cleaning_time,
          quality: entry.quality_score,
        })),
      monthly_target: target,
      monthly_completed: completed,
      monthly_remaining: Math.max(0, target - completed),
      monthly_progress: this.progress(completed, target),
    };
  }

  /** Calcule les indicateurs de performance du membre du personnel. */
  async getPerformance(id: string): Promise<HousekeepingPerformance> {
    const staff = await this.findOne(id);
    const totalRooms = staff.rooms_cleaned_total ?? 0;
    const issues = staff.total_issue_reports ?? 0;
    return {
      total_rooms: totalRooms,
      total_tasks: staff.total_tasks_completed ?? 0,
      avg_cleaning_time: staff.avg_cleaning_time ?? null,
      quality_score: staff.quality_score ?? null,
      total_issue_reports: issues,
      issue_rate: totalRooms > 0 ? round((issues / totalRooms) * 100) : 0,
      attendance_rate: staff.attendance_rate ?? null,
      monthly_progress: this.progress(
        staff.monthly_completed ?? 0,
        staff.monthly_target ?? 0,
      ),
    };
  }

  // ========================
  // HELPERS
  // ========================

  private progress(completed: number, target: number): number {
    return target > 0 ? Math.min(100, round((completed / target) * 100)) : 0;
  }

  private assertCanWork(staff: HousekeepingStaff): void {
    if (!staff.status || !WORKING_STATUSES.includes(staff.status)) {
      throw new BadRequestException(
        `Action impossible : le membre du personnel est « ${staff.status} »`,
      );
    }
  }

  /** Vérifie les horaires (format HH:mm, début ≠ fin). */
  private assertShiftHours(
    start?: string,
    end?: string,
    required = false,
  ): void {
    if (!required && start === undefined && end === undefined) return;
    if (required && (!start || !end)) {
      throw new BadRequestException('Heures de début et de fin requises');
    }
    for (const value of [start, end]) {
      if (value !== undefined && !HOUR_REGEX.test(value)) {
        throw new BadRequestException(`Heure invalide : ${value} (HH:mm)`);
      }
    }
    if (start && end && start === end) {
      throw new BadRequestException(
        "L'heure de fin doit être différente de l'heure de début",
      );
    }
  }

  /** Lève une 409 si un autre membre correspond déjà au filtre. */
  private async ensureUnique(
    filter: Record<string, unknown>,
    message: string,
    excludeId?: string,
  ): Promise<void> {
    const query: Record<string, unknown> = { ...filter };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    if (await this.repository.exists(query as QueryFilter<HousekeepingStaff>)) {
      throw new ConflictException(message);
    }
  }

  private assertStatus(status: string): void {
    if (
      !Object.values(HousekeepingStatus).includes(status as HousekeepingStatus)
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

  private buildSearchFilter(term: string): QueryFilter<HousekeepingStaff> {
    const regex = { $regex: escapeRegex(term.trim()), $options: 'i' };
    return {
      $or: [
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { phone: regex },
        { employee_code: regex },
      ],
    } as QueryFilter<HousekeepingStaff>;
  }

  private async updateOrFail(
    id: string,
    data: UpdateQuery<HousekeepingStaff>,
  ): Promise<HousekeepingStaff> {
    const doc = await this.repository.update(id, data);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  /** Retire les champs sensibles d'un document avant de le renvoyer. */
  private sanitize(doc: HousekeepingStaff): HousekeepingStaff {
    const source = doc as unknown as {
      toObject?: () => Record<string, unknown>;
    } & Record<string, unknown>;
    const plain =
      typeof source.toObject === 'function' ? source.toObject() : { ...source };
    delete plain.password_hash;
    delete plain.two_factor_secret;
    return plain as unknown as HousekeepingStaff;
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
