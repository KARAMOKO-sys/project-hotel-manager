import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainEventPublisher } from '../../platform/events/domain-event.publisher';
import {
  DomainEventName,
  DomainEvents,
} from '../../platform/events/domain-events';
import {
  ACTIVE_LEAVE_STATES,
  LeaveRequest,
  LeaveState,
} from '../schemas/leave-request.entity';
import { LeaveType } from '../schemas/leave-type.entity';
import { LeaveAllocation } from '../schemas/leave-allocation.entity';
import {
  CreateLeaveRequestDto,
  LeaveRequestQueryDto,
  RefuseLeaveDto,
  UpdateLeaveRequestDto,
} from '../dto/leave.dto';
import { HrStaffService } from './hr-staff.service';
import { HrSettingsService } from './hr-settings.service';
import {
  LeaveBalance,
  assertSufficientBalance,
  computeLeaveBalance,
  computeLeaveDays,
  dayKey,
  toDay,
  toObjectId,
} from '../hr.utils';

/** Solde détaillé par type de congé. */
export interface LeaveTypeBalance extends LeaveBalance {
  leave_type_id: string;
  name: string;
  code: string;
  requires_allocation: boolean;
}

/**
 * Demandes de congé : brouillon → soumise → approuvée / refusée, annulation
 * possible. Les jours sont calculés par le serveur (jours ouvrés de
 * l'établissement hors jours fériés). Contrôle du solde et des
 * chevauchements à la soumission ; décisions atomiques depuis « soumise ».
 */
@Injectable()
export class LeaveRequestService extends BaseCrudService<
  LeaveRequest,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto
> {
  constructor(
    @InjectModel(LeaveRequest.name)
    protected readonly leaveModel: Model<LeaveRequest>,
    @InjectModel(LeaveType.name)
    private readonly leaveTypeModel: Model<LeaveType>,
    @InjectModel(LeaveAllocation.name)
    private readonly allocationModel: Model<LeaveAllocation>,
    private readonly staff: HrStaffService,
    private readonly settings: HrSettingsService,
    private readonly events: DomainEventPublisher,
  ) {
    super(leaveModel, LeaveRequest.name);
  }

  async create(
    dto: CreateLeaveRequestDto,
    actorId?: string,
  ): Promise<LeaveRequest> {
    const staff = await this.staff.get(dto.staff_id, dto.property_id);
    await this.getLeaveType(dto.leave_type_id, staff.property_id);
    const days = await this.computeDays(staff.property_id, dto);
    return super.create({
      ...dto,
      property_id: staff.property_id,
      start_date: toDay(dto.start_date),
      end_date: toDay(dto.end_date),
      days,
      state: LeaveState.DRAFT,
      ...(actorId && Types.ObjectId.isValid(actorId)
        ? { requested_by: new Types.ObjectId(actorId) }
        : {}),
    } as never);
  }

  /** Modification d'un brouillon (jours recalculés). */
  async update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest> {
    const current = await this.findOne(id);
    if (current.state !== LeaveState.DRAFT) {
      throw new BadRequestException(
        'Seule une demande en brouillon peut être modifiée',
      );
    }
    if (dto.leave_type_id)
      await this.getLeaveType(dto.leave_type_id, current.property_id);
    const merged = {
      start_date: dto.start_date ?? current.start_date,
      end_date: dto.end_date ?? current.end_date,
      start_half_day: dto.start_half_day ?? current.start_half_day,
      end_half_day: dto.end_half_day ?? current.end_half_day,
    };
    const days = await this.computeDays(current.property_id, merged);
    const updated = await this.leaveModel
      .findOneAndUpdate(
        { _id: current._id, state: LeaveState.DRAFT },
        {
          $set: {
            ...dto,
            start_date: toDay(merged.start_date),
            end_date: toDay(merged.end_date),
            days,
          },
        },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException("La demande a changé d'état ; réessayez");
    }
    return updated;
  }

  async findAll(
    query: LeaveRequestQueryDto,
  ): Promise<PaginatedResult<LeaveRequest>> {
    const filter: QueryFilter<LeaveRequest> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.staff_id)
      filter.staff_id = toObjectId(query.staff_id, 'staff_id');
    if (query.state) filter.state = query.state;
    if (query.from) filter.end_date = { $gte: toDay(query.from) };
    if (query.to) filter.start_date = { $lte: toDay(query.to) };
    return super.findAll(query, filter);
  }

  /** Soumet un brouillon après contrôle des chevauchements et du solde. */
  async submit(id: string, actorId?: string): Promise<LeaveRequest> {
    const current = await this.findOne(id);
    if (current.state !== LeaveState.DRAFT) {
      throw new BadRequestException(
        'Seule une demande en brouillon peut être soumise',
      );
    }
    if (!(current.days > 0)) {
      throw new BadRequestException(
        'La période demandée ne contient aucun jour ouvré',
      );
    }
    const type = await this.getLeaveType(
      current.leave_type_id,
      current.property_id,
    );
    await this.assertNoOverlap(current);
    if (type.requires_allocation) {
      const balance = await this.computeBalance(
        current.staff_id,
        current.leave_type_id,
        toDay(current.start_date).getUTCFullYear(),
        current._id,
      );
      assertSufficientBalance(balance, current.days);
    }

    const now = new Date();
    const autoApprove = !type.requires_approval;
    const updated = await this.leaveModel
      .findOneAndUpdate(
        { _id: current._id, state: LeaveState.DRAFT },
        {
          $set: {
            state: autoApprove ? LeaveState.APPROVED : LeaveState.SUBMITTED,
            submitted_at: now,
            ...(autoApprove ? { decided_at: now } : {}),
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) {
      throw new ConflictException("La demande a changé d'état ; réessayez");
    }
    await this.publish(DomainEvents.LEAVE_REQUESTED, updated, actorId);
    if (autoApprove) {
      await this.publish(DomainEvents.LEAVE_APPROVED, updated, actorId, {
        auto_approved: true,
      });
    }
    return updated;
  }

  /** Approuve atomiquement une demande soumise. */
  async approve(id: string, actorId?: string): Promise<LeaveRequest> {
    const current = await this.findOne(id);
    await this.assertNoOverlap(current, [LeaveState.APPROVED]);
    const updated = await this.decide(id, LeaveState.APPROVED, actorId);
    await this.publish(DomainEvents.LEAVE_APPROVED, updated, actorId);
    return updated;
  }

  /** Refuse atomiquement une demande soumise. */
  async refuse(
    id: string,
    dto: RefuseLeaveDto,
    actorId?: string,
  ): Promise<LeaveRequest> {
    const updated = await this.decide(id, LeaveState.REFUSED, actorId, {
      refusal_reason: dto.reason,
    });
    await this.publish(DomainEvents.LEAVE_REFUSED, updated, actorId);
    return updated;
  }

  /** Annule une demande non clôturée (brouillon, soumise ou approuvée). */
  async cancel(id: string): Promise<LeaveRequest> {
    const updated = await this.leaveModel
      .findOneAndUpdate(
        {
          _id: toObjectId(id, 'id'),
          is_deleted: { $ne: true },
          state: {
            $in: [LeaveState.DRAFT, LeaveState.SUBMITTED, LeaveState.APPROVED],
          },
        },
        { $set: { state: LeaveState.CANCELLED } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) {
      throw new BadRequestException('Cette demande ne peut plus être annulée');
    }
    return updated;
  }

  async remove(id: string): Promise<LeaveRequest> {
    const current = await this.findOne(id);
    if (![LeaveState.DRAFT, LeaveState.CANCELLED].includes(current.state)) {
      throw new BadRequestException(
        'Seule une demande en brouillon ou annulée peut être supprimée',
      );
    }
    return super.remove(id);
  }

  /** Soldes de l'employé pour l'année (tous types actifs). */
  async getBalances(
    staffId: string,
    year?: number,
  ): Promise<{
    staff_id: string;
    year: number;
    balances: LeaveTypeBalance[];
  }> {
    const staff = await this.staff.get(staffId, undefined, {
      allowTerminated: true,
    });
    const y = year ?? new Date().getUTCFullYear();
    const types = await this.leaveTypeModel
      .find({ property_id: staff.property_id, is_deleted: { $ne: true } })
      .sort({ name: 1 })
      .lean()
      .exec();
    const balances: LeaveTypeBalance[] = [];
    for (const type of types) {
      const balance = await this.computeBalance(staff._id, type._id, y);
      balances.push({
        leave_type_id: String(type._id),
        name: type.name,
        code: type.code,
        requires_allocation: type.requires_allocation,
        ...balance,
      });
    }
    return { staff_id: String(staff._id), year: y, balances };
  }

  /**
   * Solde = alloué − approuvé − en attente, pour l'année (année de la date de
   * début des demandes). `excludeId` exclut la demande en cours d'examen.
   */
  async computeBalance(
    staffId: Types.ObjectId | string,
    leaveTypeId: Types.ObjectId | string,
    year: number,
    excludeId?: Types.ObjectId,
  ): Promise<LeaveBalance> {
    const staff = toObjectId(staffId, 'staff_id');
    const type = toObjectId(leaveTypeId, 'leave_type_id');
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const nextYear = new Date(Date.UTC(year + 1, 0, 1));
    const [allocations, requests] = await Promise.all([
      this.allocationModel
        .find({
          staff_id: staff,
          leave_type_id: type,
          year,
          is_deleted: { $ne: true },
        })
        .select('days')
        .lean()
        .exec(),
      this.leaveModel
        .find({
          staff_id: staff,
          leave_type_id: type,
          is_deleted: { $ne: true },
          state: { $in: ACTIVE_LEAVE_STATES },
          start_date: { $gte: yearStart, $lt: nextYear },
          ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        })
        .select('days state')
        .lean()
        .exec(),
    ]);
    const allocated = allocations.reduce((sum, a) => sum + (a.days ?? 0), 0);
    let approved = 0;
    let pending = 0;
    for (const r of requests) {
      if (r.state === LeaveState.APPROVED) approved += r.days ?? 0;
      else pending += r.days ?? 0;
    }
    return computeLeaveBalance(allocated, approved, pending);
  }

  /** Congé approuvé couvrant `date` pour l'employé (planning). */
  async findApprovedLeaveOn(
    staffId: Types.ObjectId | string,
    date: Date,
  ): Promise<LeaveRequest | null> {
    const day = toDay(date);
    return await this.leaveModel
      .findOne({
        staff_id: toObjectId(staffId, 'staff_id'),
        is_deleted: { $ne: true },
        state: LeaveState.APPROVED,
        start_date: { $lte: day },
        end_date: { $gte: day },
      })
      .lean()
      .exec();
  }

  private async decide(
    id: string,
    state: LeaveState.APPROVED | LeaveState.REFUSED,
    actorId?: string,
    extra: Record<string, unknown> = {},
  ): Promise<LeaveRequest> {
    const updated = await this.leaveModel
      .findOneAndUpdate(
        {
          _id: toObjectId(id, 'id'),
          state: LeaveState.SUBMITTED,
          is_deleted: { $ne: true },
        },
        {
          $set: {
            state,
            decided_at: new Date(),
            ...(actorId && Types.ObjectId.isValid(actorId)
              ? { approver_id: new Types.ObjectId(actorId) }
              : {}),
            ...extra,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) {
      const exists = await this.leaveModel
        .exists({ _id: toObjectId(id, 'id') })
        .exec();
      if (!exists)
        throw new NotFoundException(`Demande de congé introuvable (id: ${id})`);
      throw new BadRequestException(
        'Seule une demande soumise peut être approuvée ou refusée',
      );
    }
    return updated;
  }

  /** Refuse le chevauchement avec les autres demandes soumises/approuvées. */
  private async assertNoOverlap(
    request: Pick<LeaveRequest, 'staff_id' | 'start_date' | 'end_date'> & {
      _id?: unknown;
    },
    states: LeaveState[] = ACTIVE_LEAVE_STATES,
  ): Promise<void> {
    const conflict = await this.leaveModel
      .findOne({
        staff_id: request.staff_id,
        is_deleted: { $ne: true },
        state: { $in: states },
        _id: { $ne: request._id as Types.ObjectId },
        start_date: { $lte: toDay(request.end_date) },
        end_date: { $gte: toDay(request.start_date) },
      })
      .select('start_date end_date state')
      .lean<Pick<LeaveRequest, 'start_date' | 'end_date' | 'state'>>()
      .exec();
    if (conflict) {
      throw new ConflictException(
        `Chevauchement avec une autre demande (${dayKey(conflict.start_date)} → ${dayKey(conflict.end_date)})`,
      );
    }
  }

  private async getLeaveType(
    leaveTypeId: string | Types.ObjectId,
    propertyId: Types.ObjectId,
  ): Promise<LeaveType> {
    const type = await this.leaveTypeModel
      .findOne({
        _id: toObjectId(leaveTypeId, 'leave_type_id'),
        property_id: propertyId,
        is_deleted: { $ne: true },
      })
      .lean()
      .exec();
    if (!type) {
      throw new BadRequestException(
        'Type de congé introuvable pour cet établissement',
      );
    }
    if (type.is_active === false) {
      throw new BadRequestException('Ce type de congé est désactivé');
    }
    return type;
  }

  private async computeDays(
    propertyId: Types.ObjectId,
    period: {
      start_date: string | Date;
      end_date: string | Date;
      start_half_day?: boolean;
      end_half_day?: boolean;
    },
  ): Promise<number> {
    const settings = await this.settings.get(propertyId);
    return computeLeaveDays({
      start: period.start_date,
      end: period.end_date,
      workingDays: settings.working_days,
      holidays: settings.public_holidays.map((h) => h.date),
      startHalfDay: period.start_half_day,
      endHalfDay: period.end_half_day,
    });
  }

  private async publish(
    name: DomainEventName,
    leave: LeaveRequest,
    actorId?: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.events.publish(name, {
      property_id: String(leave.property_id),
      actor_id: actorId,
      record: { model: LeaveRequest.name, id: String(leave._id) },
      payload: {
        staff_id: String(leave.staff_id),
        leave_type_id: String(leave.leave_type_id),
        start_date: dayKey(leave.start_date),
        end_date: dayKey(leave.end_date),
        days: leave.days,
        state: leave.state,
        ...extra,
      },
    });
  }
}
