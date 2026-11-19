import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  ShiftAssignment,
  ShiftState,
} from '../schemas/shift-assignment.entity';
import { Department } from '../schemas/department.entity';
import { LeaveRequest, LeaveState } from '../schemas/leave-request.entity';
import {
  CopyWeekDto,
  CreateShiftDto,
  ShiftQueryDto,
  ShiftWeekQueryDto,
  UpdateShiftDto,
} from '../dto/shift.dto';
import { HrStaffRef, HrStaffService } from './hr-staff.service';
import { LeaveRequestService } from './leave-request.service';
import {
  addDays,
  dayKey,
  diffDays,
  round2,
  shiftHours,
  shiftInterval,
  toDay,
  toObjectId,
} from '../hr.utils';

/** Ligne du planning hebdomadaire (un employé). */
export interface WeekGridRow {
  staff_id: string;
  position?: string;
  employee_code?: string;
  total_hours: number;
  days: Record<string, ShiftAssignment[]>;
  /** Jours de la semaine couverts par un congé approuvé. */
  leave_days: string[];
}

export interface WeekGrid {
  property_id: string;
  start: string;
  end: string;
  days: string[];
  rows: WeekGridRow[];
  totals: { shifts: number; hours: number };
}

/**
 * Construit la grille hebdomadaire (pure) : une ligne par employé, une
 * colonne par jour, avec les jours de congé approuvé.
 */
export function buildWeekGrid(
  propertyId: string,
  start: Date,
  shifts: ShiftAssignment[],
  staff: Pick<HrStaffRef, '_id' | 'position' | 'employee_code'>[],
  leaves: Pick<LeaveRequest, 'staff_id' | 'start_date' | 'end_date'>[] = [],
): WeekGrid {
  const first = toDay(start);
  const days = Array.from({ length: 7 }, (_, i) => dayKey(addDays(first, i)));
  const rows = new Map<string, WeekGridRow>();
  const ensureRow = (
    staffId: string,
    info?: Pick<HrStaffRef, 'position' | 'employee_code'>,
  ) => {
    let row = rows.get(staffId);
    if (!row) {
      row = {
        staff_id: staffId,
        position: info?.position,
        employee_code: info?.employee_code,
        total_hours: 0,
        days: Object.fromEntries(days.map((d) => [d, [] as ShiftAssignment[]])),
        leave_days: [],
      };
      rows.set(staffId, row);
    } else if (info && !row.position) {
      row.position = info.position;
      row.employee_code = info.employee_code;
    }
    return row;
  };
  for (const member of staff) ensureRow(String(member._id), member);

  let totalHours = 0;
  let count = 0;
  for (const shift of shifts) {
    if (shift.state === ShiftState.CANCELLED) continue;
    const key = dayKey(shift.date);
    if (!days.includes(key)) continue;
    const row = ensureRow(String(shift.staff_id));
    row.days[key].push(shift);
    const hours = shift.hours ?? shiftHours(shift.start_time, shift.end_time);
    row.total_hours = round2(row.total_hours + hours);
    totalHours += hours;
    count += 1;
  }
  for (const row of rows.values()) {
    for (const d of days) {
      row.days[d].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
  }
  for (const leave of leaves) {
    const row = rows.get(String(leave.staff_id));
    if (!row) continue;
    for (const d of days) {
      const t = new Date(d).getTime();
      if (
        toDay(leave.start_date).getTime() <= t &&
        t <= toDay(leave.end_date).getTime()
      ) {
        if (!row.leave_days.includes(d)) row.leave_days.push(d);
      }
    }
  }
  return {
    property_id: propertyId,
    start: days[0],
    end: days[6],
    days,
    rows: [...rows.values()].sort(
      (a, b) =>
        (a.position ?? '').localeCompare(b.position ?? '') ||
        a.staff_id.localeCompare(b.staff_id),
    ),
    totals: { shifts: count, hours: round2(totalHours) },
  };
}

/**
 * Planning du personnel : créneaux datés (services de nuit possibles),
 * sans chevauchement pour un même employé ni pendant un congé approuvé.
 */
@Injectable()
export class ShiftService extends BaseCrudService<
  ShiftAssignment,
  CreateShiftDto,
  UpdateShiftDto
> {
  constructor(
    @InjectModel(ShiftAssignment.name)
    protected readonly shiftModel: Model<ShiftAssignment>,
    @InjectModel(Department.name)
    private readonly departmentModel: Model<Department>,
    @InjectModel(LeaveRequest.name)
    private readonly leaveModel: Model<LeaveRequest>,
    private readonly staff: HrStaffService,
    private readonly leaves: LeaveRequestService,
  ) {
    super(shiftModel, ShiftAssignment.name);
  }

  async create(dto: CreateShiftDto): Promise<ShiftAssignment> {
    const staff = await this.staff.get(dto.staff_id, dto.property_id);
    if (dto.department_id)
      await this.assertDepartment(dto.department_id, staff.property_id);
    const timing = this.timing(dto.date, dto.start_time, dto.end_time);
    await this.assertSchedulable(staff._id, timing);
    return super.create({
      ...dto,
      property_id: staff.property_id,
      staff_id: staff._id,
      ...timing,
      state: ShiftState.PLANNED,
    } as never);
  }

  async update(id: string, dto: UpdateShiftDto): Promise<ShiftAssignment> {
    const current = await this.findOne(id);
    if (current.state === ShiftState.CANCELLED) {
      throw new BadRequestException(
        'Un créneau annulé ne peut pas être modifié',
      );
    }
    if (dto.department_id)
      await this.assertDepartment(dto.department_id, current.property_id);
    const timing = this.timing(
      dto.date ?? current.date,
      dto.start_time ?? current.start_time,
      dto.end_time ?? current.end_time,
    );
    await this.assertSchedulable(current.staff_id, timing, current._id);
    return super.update(id, { ...dto, ...timing } as never);
  }

  async findAll(
    query: ShiftQueryDto,
  ): Promise<PaginatedResult<ShiftAssignment>> {
    const filter: QueryFilter<ShiftAssignment> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.staff_id)
      filter.staff_id = toObjectId(query.staff_id, 'staff_id');
    if (query.department_id)
      filter.department_id = toObjectId(query.department_id, 'department_id');
    if (query.state) filter.state = query.state;
    if (query.from || query.to) {
      filter.date = {
        ...(query.from ? { $gte: toDay(query.from) } : {}),
        ...(query.to ? { $lte: toDay(query.to) } : {}),
      };
    }
    return super.findAll({ ...query, sort: query.sort ?? 'starts_at' }, filter);
  }

  async confirm(id: string): Promise<ShiftAssignment> {
    return this.transition(id, [ShiftState.PLANNED], ShiftState.CONFIRMED);
  }

  async cancel(id: string): Promise<ShiftAssignment> {
    return this.transition(
      id,
      [ShiftState.PLANNED, ShiftState.CONFIRMED],
      ShiftState.CANCELLED,
    );
  }

  /** Grille hebdomadaire d'un établissement. */
  async getWeek(query: ShiftWeekQueryDto): Promise<WeekGrid> {
    const propertyId = toObjectId(query.property_id, 'property_id');
    const start = toDay(query.start);
    const end = addDays(start, 7);
    const shiftFilter: QueryFilter<ShiftAssignment> = {
      property_id: propertyId,
      is_deleted: { $ne: true },
      state: { $ne: ShiftState.CANCELLED },
      date: { $gte: start, $lt: end },
    };
    if (query.department_id) {
      shiftFilter.department_id = toObjectId(
        query.department_id,
        'department_id',
      );
    }
    const [shifts, staff, leaves] = await Promise.all([
      this.shiftModel.find(shiftFilter).sort({ starts_at: 1 }).lean().exec(),
      query.department_id
        ? Promise.resolve([])
        : this.staff.listCurrent(propertyId),
      this.leaveModel
        .find({
          property_id: propertyId,
          is_deleted: { $ne: true },
          state: LeaveState.APPROVED,
          start_date: { $lt: end },
          end_date: { $gte: start },
        })
        .select('staff_id start_date end_date')
        .lean()
        .exec(),
    ]);
    return buildWeekGrid(String(propertyId), start, shifts, staff, leaves);
  }

  /**
   * Copie les créneaux (non annulés) d'une semaine vers une autre. Les
   * créneaux en conflit (chevauchement, congé approuvé, employé parti) sont
   * ignorés et listés dans `skipped`.
   */
  async copyWeek(dto: CopyWeekDto): Promise<{
    created: number;
    skipped: { source_id: string; reason: string }[];
  }> {
    const propertyId = toObjectId(dto.property_id, 'property_id');
    const source = toDay(dto.source_start);
    const target = dto.target_start
      ? toDay(dto.target_start)
      : addDays(source, 7);
    const offset = diffDays(source, target);
    if (offset === 0) {
      throw new BadRequestException(
        'La semaine cible doit différer de la semaine source',
      );
    }
    if (Math.abs(offset) < 7) {
      throw new BadRequestException(
        'La semaine cible ne doit pas chevaucher la semaine source',
      );
    }
    const filter: QueryFilter<ShiftAssignment> = {
      property_id: propertyId,
      is_deleted: { $ne: true },
      state: { $ne: ShiftState.CANCELLED },
      date: { $gte: source, $lt: addDays(source, 7) },
    };
    if (dto.department_id)
      filter.department_id = toObjectId(dto.department_id, 'department_id');
    const shifts = (await this.shiftModel
      .find(filter)
      .sort({ starts_at: 1 })
      .lean()
      .exec()) as unknown as ShiftAssignment[];

    const skipped: { source_id: string; reason: string }[] = [];
    const docs: Record<string, unknown>[] = [];
    for (const shift of shifts) {
      const date = addDays(shift.date, offset);
      const timing = this.timing(date, shift.start_time, shift.end_time);
      try {
        await this.staff.get(shift.staff_id, propertyId);
        await this.assertSchedulable(shift.staff_id, timing);
      } catch (error) {
        skipped.push({
          source_id: String(shift._id),
          reason: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      docs.push({
        property_id: propertyId,
        staff_id: shift.staff_id,
        department_id: shift.department_id,
        role: shift.role,
        notes: shift.notes,
        ...timing,
        state:
          dto.keep_state && shift.state === ShiftState.CONFIRMED
            ? ShiftState.CONFIRMED
            : ShiftState.PLANNED,
        is_deleted: false,
      });
    }
    if (docs.length > 0) await this.shiftModel.insertMany(docs);
    return { created: docs.length, skipped };
  }

  /** Date normalisée, bornes réelles et durée d'un créneau. */
  private timing(date: Date | string, startTime: string, endTime: string) {
    const day = toDay(date);
    const { start, end } = shiftInterval(day, startTime, endTime);
    return {
      date: day,
      start_time: startTime,
      end_time: endTime,
      starts_at: start,
      ends_at: end,
      hours: shiftHours(startTime, endTime),
    };
  }

  /** Pas de chevauchement avec un autre créneau, ni pendant un congé approuvé. */
  async assertSchedulable(
    staffId: Types.ObjectId | string,
    timing: { date: Date; starts_at: Date; ends_at: Date },
    excludeId?: Types.ObjectId,
  ): Promise<void> {
    const overlapping = await this.shiftModel
      .findOne({
        staff_id: toObjectId(staffId, 'staff_id'),
        is_deleted: { $ne: true },
        state: { $ne: ShiftState.CANCELLED },
        starts_at: { $lt: timing.ends_at },
        ends_at: { $gt: timing.starts_at },
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
      .select('date start_time end_time')
      .lean()
      .exec();
    if (overlapping) {
      throw new ConflictException(
        `Chevauchement avec le créneau du ${dayKey(overlapping.date)} (${overlapping.start_time} → ${overlapping.end_time})`,
      );
    }
    const leave = await this.leaves.findApprovedLeaveOn(staffId, timing.date);
    if (leave) {
      throw new ConflictException(
        `L'employé est en congé approuvé le ${dayKey(timing.date)}`,
      );
    }
  }

  private async assertDepartment(
    departmentId: string,
    propertyId: Types.ObjectId,
  ) {
    const exists = await this.departmentModel
      .exists({
        _id: toObjectId(departmentId, 'department_id'),
        property_id: propertyId,
        is_deleted: { $ne: true },
      })
      .exec();
    if (!exists) {
      throw new BadRequestException(
        'Département introuvable pour cet établissement',
      );
    }
  }

  private async transition(
    id: string,
    from: ShiftState[],
    to: ShiftState,
  ): Promise<ShiftAssignment> {
    const updated = await this.shiftModel
      .findOneAndUpdate(
        {
          _id: toObjectId(id, 'id'),
          is_deleted: { $ne: true },
          state: { $in: from },
        },
        { $set: { state: to } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) {
      await this.findOne(id);
      throw new BadRequestException(`Transition impossible vers « ${to} »`);
    }
    return updated;
  }
}
