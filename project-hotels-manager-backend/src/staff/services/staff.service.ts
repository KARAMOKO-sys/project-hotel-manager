import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  EmploymentStatus,
  STAFF_WEEK_DAYS,
  Staff,
  StaffDepartment,
  StaffDocument,
  StaffWeekDay,
} from '../schemas/staff.entity';
import {
  CreateStaffDto,
  STAFF_HOUR_REGEX,
  StaffShiftDto,
} from '../dto/create-staff.dto';
import { UpdateStaffDto } from '../dto/update-staff.dto';
import { TransferStaffDto } from '../dto/staff-actions.dto';

/** Statuts correspondant à une affectation « en cours ». */
const CURRENT_STATUSES: EmploymentStatus[] = [
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ON_LEAVE,
  EmploymentStatus.SUSPENDED,
];

/** Filtres optionnels pour la liste du personnel d'une propriété. */
export interface StaffPropertyFilters {
  department?: StaffDepartment;
  status?: EmploymentStatus;
}

/** Effectifs d'une propriété. */
export interface StaffHeadcount {
  total: number;
  active: number;
  by_department: Record<string, number>;
  by_status: Record<string, number>;
}

/**
 * Service de gestion des affectations du personnel (employé ↔ propriété).
 *
 * Étend le CRUD générique et ajoute : contrôle des doublons (une affectation
 * en cours par utilisateur et par propriété, matricule unique par propriété),
 * planning hebdomadaire (calcul des heures), hiérarchie, cycle de vie du
 * contrat (congé, suspension, départ, mutation) et effectifs.
 */
@Injectable()
export class StaffService extends BaseCrudService<
  Staff,
  CreateStaffDto,
  UpdateStaffDto
> {
  constructor(
    @InjectModel(Staff.name)
    protected readonly staffModel: Model<Staff>,
  ) {
    super(staffModel, Staff.name);
  }

  /** Crée une affectation après contrôle des doublons et des dates. */
  async create(createStaffDto: CreateStaffDto): Promise<Staff> {
    const dto = createStaffDto;
    const userId = this.toObjectId(dto.user_id, 'user_id');
    const propertyId = this.toObjectId(dto.property_id, 'property_id');
    const hireDate = dto.hire_date ? new Date(dto.hire_date) : new Date();
    this.assertDates(hireDate, dto.end_date ? new Date(dto.end_date) : null);
    if (dto.schedule) {
      this.assertValidSchedule(dto.schedule);
    }

    await this.ensureNoCurrentAssignment(userId, propertyId);
    if (dto.employee_code) {
      await this.ensureEmployeeCodeAvailable(propertyId, dto.employee_code);
    }

    return this.repository.create({
      ...dto,
      user_id: userId,
      property_id: propertyId,
      organization_id: dto.organization_id
        ? this.toObjectId(dto.organization_id, 'organization_id')
        : undefined,
      manager_id: dto.manager_id
        ? this.toObjectId(dto.manager_id, 'manager_id')
        : undefined,
      hire_date: hireDate,
      end_date: dto.end_date ? new Date(dto.end_date) : undefined,
      weekly_hours: dto.schedule
        ? this.computeWeeklyHours(dto.schedule)
        : (dto.weekly_hours ?? 0),
      employment_status: EmploymentStatus.ACTIVE,
      status_changed_at: new Date(),
    } as unknown as Partial<Staff>);
  }

  /** Liste paginée, avec recherche libre optionnelle (`?search=`). */
  async findAll(
    query: PaginationQueryDto,
    filter: QueryFilter<Staff> = {},
  ): Promise<PaginatedResult<Staff>> {
    const searchFilter = query.search
      ? this.buildSearchFilter(query.search)
      : {};
    return super.findAll(query, {
      ...filter,
      ...searchFilter,
    } as QueryFilter<Staff>);
  }

  /** Met à jour une affectation (planning, matricule et dates contrôlés). */
  async update(id: string, updateStaffDto: UpdateStaffDto): Promise<Staff> {
    const dto = updateStaffDto;
    if (dto.schedule) {
      this.assertValidSchedule(dto.schedule);
    }

    const needsCurrent =
      !!dto.employee_code || !!dto.hire_date || !!dto.end_date;
    if (needsCurrent) {
      const current = await this.findOne(id);
      if (dto.employee_code) {
        await this.ensureEmployeeCodeAvailable(
          current.property_id,
          dto.employee_code,
          id,
        );
      }
      this.assertDates(
        dto.hire_date ? new Date(dto.hire_date) : current.hire_date,
        dto.end_date ? new Date(dto.end_date) : (current.end_date ?? null),
      );
    }

    const update: Record<string, unknown> = { ...dto };
    if (dto.schedule) {
      update.weekly_hours = this.computeWeeklyHours(dto.schedule);
    }
    return super.update(id, update as UpdateStaffDto);
  }

  /** Liste le personnel d'une propriété (filtrable par service et statut). */
  findByProperty(
    propertyId: string,
    query: PaginationQueryDto,
    filters: StaffPropertyFilters = {},
  ): Promise<PaginatedResult<Staff>> {
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'propertyId'),
    };
    if (filters.department) {
      if (!Object.values(StaffDepartment).includes(filters.department)) {
        throw new BadRequestException(
          `Service invalide : ${filters.department}`,
        );
      }
      filter.department = filters.department;
    }
    if (filters.status) {
      this.assertStatus(filters.status);
      filter.employment_status = filters.status;
    }
    return this.findAll(query, filter as QueryFilter<Staff>);
  }

  /** Liste le personnel d'une organisation. */
  findByOrganization(
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Staff>> {
    return this.findAll(query, {
      organization_id: this.toObjectId(organizationId, 'organizationId'),
    } as QueryFilter<Staff>);
  }

  /** Liste toutes les affectations d'un utilisateur (les plus récentes d'abord). */
  findByUser(userId: string): Promise<Staff[]> {
    return this.repository.find(
      {
        user_id: this.toObjectId(userId, 'userId'),
        is_deleted: { $ne: true },
      } as QueryFilter<Staff>,
      { sort: '-hire_date' },
    );
  }

  /** Liste les collaborateurs rattachés directement à un responsable. */
  async getDirectReports(id: string): Promise<Staff[]> {
    await this.findOne(id);
    return this.repository.find(
      {
        manager_id: new Types.ObjectId(id),
        employment_status: { $ne: EmploymentStatus.TERMINATED },
        is_deleted: { $ne: true },
      } as QueryFilter<Staff>,
      { sort: 'position' },
    );
  }

  /** Liste le personnel actif planifié un jour donné sur une propriété. */
  findScheduledOn(propertyId: string, day: string): Promise<Staff[]> {
    const weekDay = (day ?? '').toLowerCase() as StaffWeekDay;
    if (!STAFF_WEEK_DAYS.includes(weekDay)) {
      throw new BadRequestException(`Jour invalide : ${day}`);
    }
    return this.repository.find(
      {
        property_id: this.toObjectId(propertyId, 'propertyId'),
        employment_status: EmploymentStatus.ACTIVE,
        'schedule.day': weekDay,
        is_deleted: { $ne: true },
      } as QueryFilter<Staff>,
      { sort: 'department' },
    );
  }

  /**
   * Affecte un responsable : il doit exister, être en poste sur la même
   * propriété et ne pas être le collaborateur lui-même (ni son subordonné
   * direct).
   */
  async assignManager(id: string, managerId: string): Promise<Staff> {
    if (id === managerId) {
      throw new BadRequestException(
        'Un employé ne peut pas être son propre responsable',
      );
    }
    const managerObjectId = this.toObjectId(managerId, 'manager_id');
    const staff = await this.findOne(id);
    const manager = await this.repository.findById(managerObjectId);
    if (!manager || manager.is_deleted) {
      throw new NotFoundException(`Responsable introuvable (id: ${managerId})`);
    }
    if (manager.property_id.toString() !== staff.property_id.toString()) {
      throw new BadRequestException(
        'Le responsable doit être affecté à la même propriété',
      );
    }
    if (manager.employment_status === EmploymentStatus.TERMINATED) {
      throw new BadRequestException("Le responsable n'est plus en poste");
    }
    if (manager.manager_id?.toString() === id) {
      throw new BadRequestException(
        'Affectation circulaire : ce responsable est déjà sous ses ordres',
      );
    }
    return this.updateOrFail(id, { manager_id: managerObjectId });
  }

  /** Remplace le planning et recalcule les heures hebdomadaires. */
  updateSchedule(id: string, schedule: StaffShiftDto[]): Promise<Staff> {
    this.assertValidSchedule(schedule);
    return this.updateOrFail(id, {
      schedule,
      weekly_hours: this.computeWeeklyHours(schedule),
    } as UpdateQuery<Staff>);
  }

  /** Met un employé actif en congé. */
  putOnLeave(id: string, reason?: string): Promise<Staff> {
    return this.transition(
      id,
      [EmploymentStatus.ACTIVE],
      EmploymentStatus.ON_LEAVE,
      reason,
    );
  }

  /** Retour de congé. */
  returnFromLeave(id: string): Promise<Staff> {
    return this.transition(
      id,
      [EmploymentStatus.ON_LEAVE],
      EmploymentStatus.ACTIVE,
    );
  }

  /** Suspend un employé (actif ou en congé). */
  suspend(id: string, reason?: string): Promise<Staff> {
    return this.transition(
      id,
      [EmploymentStatus.ACTIVE, EmploymentStatus.ON_LEAVE],
      EmploymentStatus.SUSPENDED,
      reason,
    );
  }

  /** Lève la suspension d'un employé. */
  reactivate(id: string): Promise<Staff> {
    return this.transition(
      id,
      [EmploymentStatus.SUSPENDED],
      EmploymentStatus.ACTIVE,
    );
  }

  /** Met fin au contrat (date de départ ≥ date d'embauche). */
  async terminate(
    id: string,
    reason: string,
    endDate?: string,
  ): Promise<Staff> {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('La raison du départ est requise');
    }
    const staff = await this.findOne(id);
    if (staff.employment_status === EmploymentStatus.TERMINATED) {
      throw new BadRequestException('Ce contrat est déjà terminé');
    }
    const end = endDate ? new Date(endDate) : new Date();
    this.assertDates(staff.hire_date, end);

    return this.updateOrFail(id, {
      employment_status: EmploymentStatus.TERMINATED,
      end_date: end,
      status_reason: reason.trim(),
      status_changed_at: new Date(),
    });
  }

  /**
   * Mute un employé vers une autre propriété (le responsable est retiré
   * puisqu'il appartient à l'ancienne propriété).
   */
  async transfer(id: string, dto: TransferStaffDto): Promise<Staff> {
    const targetPropertyId = this.toObjectId(dto.property_id, 'property_id');
    const staff = await this.findOne(id);
    if (staff.employment_status === EmploymentStatus.TERMINATED) {
      throw new BadRequestException(
        'Impossible de muter un employé dont le contrat est terminé',
      );
    }
    if (staff.property_id.toString() === dto.property_id) {
      throw new BadRequestException(
        "L'employé est déjà affecté à cette propriété",
      );
    }
    await this.ensureNoCurrentAssignment(staff.user_id, targetPropertyId);
    if (staff.employee_code) {
      await this.ensureEmployeeCodeAvailable(
        targetPropertyId,
        staff.employee_code,
        id,
      );
    }

    const update: Record<string, unknown> = {
      property_id: targetPropertyId,
      manager_id: null,
      'metadata.previous_property_id': staff.property_id,
      'metadata.transferred_at': new Date(),
    };
    if (dto.organization_id) {
      update.organization_id = this.toObjectId(
        dto.organization_id,
        'organization_id',
      );
    }
    if (dto.position) {
      update.position = dto.position;
    }
    if (dto.department) {
      update.department = dto.department;
    }
    return this.updateOrFail(id, update as UpdateQuery<Staff>);
  }

  /** Effectifs d'une propriété par service et par statut. */
  async getHeadcount(propertyId: string): Promise<StaffHeadcount> {
    type Row = { _id: string; count: number };
    const [result] = await this.staffModel
      .aggregate<{ by_department: Row[]; by_status: Row[] }>([
        {
          $match: {
            property_id: this.toObjectId(propertyId, 'propertyId'),
            is_deleted: { $ne: true },
          },
        },
        {
          $facet: {
            by_department: [
              {
                $match: {
                  employment_status: { $ne: EmploymentStatus.TERMINATED },
                },
              },
              { $group: { _id: '$department', count: { $sum: 1 } } },
            ],
            by_status: [
              { $group: { _id: '$employment_status', count: { $sum: 1 } } },
            ],
          },
        },
      ])
      .exec();

    const toRecord = (rows: Row[] = []) =>
      Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const byStatus = toRecord(result?.by_status);
    const total = CURRENT_STATUSES.reduce(
      (sum, status) => sum + (byStatus[status] ?? 0),
      0,
    );

    return {
      total,
      active: byStatus[EmploymentStatus.ACTIVE] ?? 0,
      by_department: toRecord(result?.by_department),
      by_status: byStatus,
    };
  }

  // ========================
  // HELPERS
  // ========================

  /** Applique une transition de statut si le statut courant l'autorise. */
  private async transition(
    id: string,
    from: EmploymentStatus[],
    to: EmploymentStatus,
    reason?: string,
  ): Promise<Staff> {
    const staff = await this.findOne(id);
    if (!from.includes(staff.employment_status)) {
      throw new BadRequestException(
        `Transition impossible de « ${staff.employment_status} » vers « ${to} »`,
      );
    }
    return this.updateOrFail(id, {
      employment_status: to,
      status_reason: reason ?? null,
      status_changed_at: new Date(),
    } as UpdateQuery<Staff>);
  }

  /** Calcule les heures hebdomadaires (créneaux de nuit gérés). */
  private computeWeeklyHours(schedule: StaffShiftDto[]): number {
    const minutes = schedule.reduce((total, shift) => {
      let duration = toMinutes(shift.end) - toMinutes(shift.start);
      if (duration <= 0) {
        duration += 24 * 60;
      }
      return total + duration;
    }, 0);
    return Math.round((minutes / 60) * 100) / 100;
  }

  /** Vérifie les créneaux : jour valide et unique, HH:mm, début ≠ fin. */
  private assertValidSchedule(schedule: StaffShiftDto[]): void {
    const seen = new Set<string>();
    for (const shift of schedule) {
      if (!STAFF_WEEK_DAYS.includes(shift.day)) {
        throw new BadRequestException(`Jour invalide : ${shift.day}`);
      }
      if (seen.has(shift.day)) {
        throw new BadRequestException(
          `Un seul créneau par jour est autorisé (${shift.day})`,
        );
      }
      seen.add(shift.day);
      if (
        !STAFF_HOUR_REGEX.test(shift.start) ||
        !STAFF_HOUR_REGEX.test(shift.end)
      ) {
        throw new BadRequestException(
          `Horaires invalides pour ${shift.day} (format HH:mm)`,
        );
      }
      if (shift.start === shift.end) {
        throw new BadRequestException(
          `Le créneau de ${shift.day} doit avoir une heure de fin distincte`,
        );
      }
    }
  }

  private assertDates(hireDate: Date, endDate: Date | null): void {
    if (Number.isNaN(hireDate.getTime())) {
      throw new BadRequestException("Date d'embauche invalide");
    }
    if (endDate && (Number.isNaN(endDate.getTime()) || endDate < hireDate)) {
      throw new BadRequestException(
        "La date de fin doit être postérieure à la date d'embauche",
      );
    }
  }

  private assertStatus(status: string): void {
    if (!Object.values(EmploymentStatus).includes(status as EmploymentStatus)) {
      throw new BadRequestException(`Statut invalide : ${status}`);
    }
  }

  /** Lève une 409 si l'utilisateur a déjà une affectation en cours. */
  private async ensureNoCurrentAssignment(
    userId: Types.ObjectId,
    propertyId: Types.ObjectId,
  ): Promise<void> {
    const exists = await this.repository.exists({
      user_id: userId,
      property_id: propertyId,
      employment_status: { $in: CURRENT_STATUSES },
      is_deleted: { $ne: true },
    } as QueryFilter<Staff>);
    if (exists) {
      throw new ConflictException(
        'Cet utilisateur a déjà une affectation en cours sur cette propriété',
      );
    }
  }

  /** Lève une 409 si le matricule est déjà utilisé sur la propriété. */
  private async ensureEmployeeCodeAvailable(
    propertyId: Types.ObjectId,
    employeeCode: string,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      property_id: propertyId,
      employee_code: employeeCode,
      is_deleted: { $ne: true },
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    if (await this.repository.exists(filter as QueryFilter<Staff>)) {
      throw new ConflictException(
        `Le matricule ${employeeCode} est déjà utilisé sur cette propriété`,
      );
    }
  }

  private toObjectId(value: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${field} invalide`);
    }
    return new Types.ObjectId(value);
  }

  private buildSearchFilter(term: string): QueryFilter<Staff> {
    const regex = { $regex: escapeRegex(term.trim()), $options: 'i' };
    return {
      $or: [{ position: regex }, { employee_code: regex }, { skills: regex }],
    } as QueryFilter<Staff>;
  }

  private async updateOrFail(
    id: string,
    data: UpdateQuery<Staff>,
  ): Promise<Staff> {
    const doc = await this.repository.update(id, data);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }
}

/** Convertit une heure `HH:mm` en minutes depuis minuit. */
function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Échappe les caractères spéciaux d'une expression régulière. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
