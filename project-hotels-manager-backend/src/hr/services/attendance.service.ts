import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainEventPublisher } from '../../platform/events/domain-event.publisher';
import { DomainEvents } from '../../platform/events/domain-events';
import { Attendance, AttendanceSource } from '../schemas/attendance.entity';
import {
  ShiftAssignment,
  ShiftState,
} from '../schemas/shift-assignment.entity';
import {
  AttendanceQueryDto,
  AttendanceReportQueryDto,
  CheckInDto,
  CheckOutDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from '../dto/attendance.dto';
import { HrStaffService } from './hr-staff.service';
import {
  addDays,
  computeWorkedHours,
  dayKey,
  isDuplicateKeyError,
  round2,
  toDay,
  toObjectId,
} from '../hr.utils';

/** Ligne du rapport de présence (un employé sur la période). */
export interface AttendanceReportRow {
  staff_id: string;
  position?: string;
  employee_code?: string;
  attendances: number;
  worked_hours: number;
  planned_shifts: number;
  planned_hours: number;
  /** worked_hours − planned_hours (négatif = heures manquantes). */
  difference: number;
  /** Pointage encore ouvert sur la période. */
  open_attendance: boolean;
}

/**
 * Agrège (pure) heures pointées et heures planifiées par employé.
 */
export function buildAttendanceReport(
  attendances: Pick<Attendance, 'staff_id' | 'worked_hours' | 'is_open'>[],
  shifts: Pick<ShiftAssignment, 'staff_id' | 'hours' | 'state'>[],
  staffInfo: Map<
    string,
    { position?: string; employee_code?: string }
  > = new Map(),
): AttendanceReportRow[] {
  const rows = new Map<string, AttendanceReportRow>();
  const row = (id: string) => {
    let r = rows.get(id);
    if (!r) {
      const info = staffInfo.get(id);
      r = {
        staff_id: id,
        position: info?.position,
        employee_code: info?.employee_code,
        attendances: 0,
        worked_hours: 0,
        planned_shifts: 0,
        planned_hours: 0,
        difference: 0,
        open_attendance: false,
      };
      rows.set(id, r);
    }
    return r;
  };
  for (const a of attendances) {
    const r = row(String(a.staff_id));
    r.attendances += 1;
    r.worked_hours = round2(r.worked_hours + (a.worked_hours ?? 0));
    if (a.is_open) r.open_attendance = true;
  }
  for (const s of shifts) {
    if (s.state === ShiftState.CANCELLED) continue;
    const r = row(String(s.staff_id));
    r.planned_shifts += 1;
    r.planned_hours = round2(r.planned_hours + (s.hours ?? 0));
  }
  for (const r of rows.values())
    r.difference = round2(r.worked_hours - r.planned_hours);
  return [...rows.values()].sort((a, b) =>
    a.staff_id.localeCompare(b.staff_id),
  );
}

/**
 * Pointages : entrée / sortie (un seul pointage ouvert par employé, garanti
 * par un index unique partiel), saisie manuelle et rapport des heures.
 */
@Injectable()
export class AttendanceService extends BaseCrudService<
  Attendance,
  CreateAttendanceDto,
  UpdateAttendanceDto
> {
  constructor(
    @InjectModel(Attendance.name)
    protected readonly attendanceModel: Model<Attendance>,
    @InjectModel(ShiftAssignment.name)
    private readonly shiftModel: Model<ShiftAssignment>,
    private readonly staff: HrStaffService,
    private readonly events: DomainEventPublisher,
  ) {
    super(attendanceModel, Attendance.name);
  }

  /** Pointage d'entrée. */
  async checkIn(dto: CheckInDto, actorId?: string): Promise<Attendance> {
    const staff = await this.staff.get(dto.staff_id, dto.property_id);
    const at = dto.at ? new Date(dto.at) : new Date();
    if (at.getTime() > Date.now() + 5 * 60_000) {
      throw new BadRequestException(
        'Le pointage ne peut pas être dans le futur',
      );
    }
    let created: Attendance;
    try {
      created = await super.create({
        property_id: staff.property_id,
        staff_id: staff._id,
        check_in: at,
        is_open: true,
        worked_hours: 0,
        source: dto.source ?? AttendanceSource.MANUAL,
        notes: dto.notes,
      } as never);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          "L'employé a déjà un pointage d'entrée ouvert",
        );
      }
      throw error;
    }
    await this.events.publish(DomainEvents.ATTENDANCE_CHECKED_IN, {
      property_id: String(staff.property_id),
      actor_id: actorId,
      record: { model: Attendance.name, id: String(created._id) },
      payload: {
        staff_id: String(staff._id),
        check_in: at.toISOString(),
        source: created.source,
      },
    });
    return created;
  }

  /** Pointage de sortie du pointage ouvert (heures calculées). */
  async checkOut(dto: CheckOutDto): Promise<Attendance> {
    const staff = await this.staff.get(dto.staff_id, dto.property_id, {
      allowTerminated: true,
    });
    const open = await this.attendanceModel
      .findOne({
        staff_id: staff._id,
        is_open: true,
        is_deleted: { $ne: true },
      })
      .lean()
      .exec();
    if (!open) {
      throw new BadRequestException(
        "Aucun pointage d'entrée ouvert pour cet employé",
      );
    }
    const at = dto.at ? new Date(dto.at) : new Date();
    const worked = computeWorkedHours(open.check_in, at);
    const updated = await this.attendanceModel
      .findOneAndUpdate(
        { _id: open._id, is_open: true },
        {
          $set: {
            check_out: at,
            is_open: false,
            worked_hours: worked,
            ...(dto.notes ? { notes: dto.notes } : {}),
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) {
      throw new ConflictException('Ce pointage a déjà été clôturé');
    }
    return updated;
  }

  /** Saisie manuelle d'un pointage complet. */
  async create(dto: CreateAttendanceDto): Promise<Attendance> {
    const staff = await this.staff.get(dto.staff_id, dto.property_id, {
      allowTerminated: true,
    });
    const worked = computeWorkedHours(dto.check_in, dto.check_out);
    await this.assertNoOverlap(staff._id, dto.check_in, dto.check_out);
    return super.create({
      property_id: staff.property_id,
      staff_id: staff._id,
      check_in: dto.check_in,
      check_out: dto.check_out,
      is_open: false,
      worked_hours: worked,
      source: AttendanceSource.MANUAL,
      notes: dto.notes,
    } as never);
  }

  /** Correction : heures recalculées. */
  async update(id: string, dto: UpdateAttendanceDto): Promise<Attendance> {
    const current = await this.findOne(id);
    const checkIn = dto.check_in ?? current.check_in;
    const checkOut = dto.check_out ?? current.check_out;
    const $set: Record<string, unknown> = { ...dto };
    if (checkOut) {
      $set.worked_hours = computeWorkedHours(checkIn, checkOut);
      $set.is_open = false;
      await this.assertNoOverlap(
        current.staff_id,
        checkIn,
        checkOut,
        current._id,
      );
    }
    return super.update(id, $set);
  }

  async findAll(
    query: AttendanceQueryDto,
  ): Promise<PaginatedResult<Attendance>> {
    const filter: QueryFilter<Attendance> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.staff_id)
      filter.staff_id = toObjectId(query.staff_id, 'staff_id');
    if (query.from || query.to) {
      filter.check_in = {
        ...(query.from ? { $gte: toDay(query.from) } : {}),
        ...(query.to ? { $lt: addDays(toDay(query.to), 1) } : {}),
      };
    }
    return super.findAll({ ...query, sort: query.sort ?? '-check_in' }, filter);
  }

  /** Heures pointées vs planifiées par employé sur [from, to] (inclus). */
  async report(query: AttendanceReportQueryDto): Promise<{
    property_id: string;
    from: string;
    to: string;
    rows: AttendanceReportRow[];
    totals: { worked_hours: number; planned_hours: number; difference: number };
  }> {
    const propertyId = toObjectId(query.property_id, 'property_id');
    const from = toDay(query.from);
    const to = toDay(query.to);
    if (to < from) {
      throw new BadRequestException(
        'La date de fin doit suivre la date de début',
      );
    }
    const staffFilter = query.staff_id
      ? { staff_id: toObjectId(query.staff_id, 'staff_id') }
      : {};
    const [attendances, shifts] = await Promise.all([
      this.attendanceModel
        .find({
          property_id: propertyId,
          is_deleted: { $ne: true },
          check_in: { $gte: from, $lt: addDays(to, 1) },
          ...staffFilter,
        })
        .select('staff_id worked_hours is_open')
        .lean()
        .exec(),
      this.shiftModel
        .find({
          property_id: propertyId,
          is_deleted: { $ne: true },
          state: { $ne: ShiftState.CANCELLED },
          date: { $gte: from, $lte: to },
          ...staffFilter,
        })
        .select('staff_id hours state')
        .lean()
        .exec(),
    ]);
    const ids = [
      ...new Set([...attendances, ...shifts].map((r) => String(r.staff_id))),
    ].map((id) => new Types.ObjectId(id));
    const staff = await this.staff.findMany(ids);
    const info = new Map(
      staff.map((s) => [
        String(s._id),
        { position: s.position, employee_code: s.employee_code },
      ]),
    );
    const rows = buildAttendanceReport(attendances, shifts, info);
    const worked = round2(rows.reduce((s, r) => s + r.worked_hours, 0));
    const planned = round2(rows.reduce((s, r) => s + r.planned_hours, 0));
    return {
      property_id: String(propertyId),
      from: dayKey(from),
      to: dayKey(to),
      rows,
      totals: {
        worked_hours: worked,
        planned_hours: planned,
        difference: round2(worked - planned),
      },
    };
  }

  private async assertNoOverlap(
    staffId: Types.ObjectId,
    checkIn: Date,
    checkOut: Date,
    excludeId?: Types.ObjectId,
  ) {
    const conflict = await this.attendanceModel
      .exists({
        staff_id: staffId,
        is_deleted: { $ne: true },
        check_in: { $lt: new Date(checkOut) },
        $or: [{ check_out: { $gt: new Date(checkIn) } }, { is_open: true }],
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
      .exec();
    if (conflict) {
      throw new ConflictException('Ce pointage chevauche un pointage existant');
    }
  }
}
