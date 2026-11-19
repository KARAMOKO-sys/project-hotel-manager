/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks Mongoose typés `any` */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { LeaveRequestService } from './leave-request.service';
import { ShiftService, buildWeekGrid } from './shift.service';
import { buildAttendanceReport } from './attendance.service';
import { LeaveState } from '../schemas/leave-request.entity';
import { ShiftState } from '../schemas/shift-assignment.entity';
import { DomainEvents } from '../../platform/events/domain-events';

const chain = (value: unknown) => {
  const c: any = {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
  return c;
};

describe('LeaveRequestService.submit', () => {
  const propertyId = new Types.ObjectId();
  const staffId = new Types.ObjectId();
  const typeId = new Types.ObjectId();
  let leaveModel: any;
  let leaveTypeModel: any;
  let allocationModel: any;
  let events: any;
  let service: LeaveRequestService;
  let draft: any;
  let leaveType: any;

  beforeEach(() => {
    draft = {
      _id: new Types.ObjectId(),
      property_id: propertyId,
      staff_id: staffId,
      leave_type_id: typeId,
      start_date: new Date('2026-12-01'),
      end_date: new Date('2026-12-03'),
      days: 3,
      state: LeaveState.DRAFT,
    };
    leaveType = {
      _id: typeId,
      requires_allocation: true,
      requires_approval: true,
      is_active: true,
    };
    leaveModel = {
      findById: jest.fn().mockImplementation(() => chain(draft)),
      // 1er appel : contrôle de chevauchement ; 2e : demandes du solde.
      findOne: jest.fn().mockImplementation(() => chain(null)),
      find: jest.fn().mockImplementation(() => chain([])),
      findOneAndUpdate: jest
        .fn()
        .mockImplementation((_f: any, u: any) =>
          chain({ ...draft, ...u.$set }),
        ),
    };
    leaveTypeModel = {
      findOne: jest.fn().mockImplementation(() => chain(leaveType)),
    };
    allocationModel = {
      find: jest.fn().mockImplementation(() => chain([{ days: 10 }])),
    };
    events = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new LeaveRequestService(
      leaveModel,
      leaveTypeModel,
      allocationModel,
      {} as any,
      {} as any,
      events,
    );
  });

  it('submits when balance is sufficient and publishes LEAVE_REQUESTED', async () => {
    const result = await service.submit(
      String(draft._id),
      String(new Types.ObjectId()),
    );
    expect(result.state).toBe(LeaveState.SUBMITTED);
    expect(leaveModel.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
      state: LeaveState.DRAFT,
    });
    expect(events.publish).toHaveBeenCalledWith(
      DomainEvents.LEAVE_REQUESTED,
      expect.anything(),
    );
  });

  it('rejects when approved + pending exhaust the allocation', async () => {
    leaveModel.find.mockImplementation(() =>
      chain([
        { days: 6, state: LeaveState.APPROVED },
        { days: 2, state: LeaveState.SUBMITTED },
      ]),
    );
    await expect(service.submit(String(draft._id))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(leaveModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('skips the balance check for types without allocation', async () => {
    leaveType.requires_allocation = false;
    allocationModel.find.mockImplementation(() => chain([]));
    await expect(service.submit(String(draft._id))).resolves.toBeDefined();
  });

  it('rejects an overlapping submitted/approved request', async () => {
    leaveModel.findOne.mockImplementation(() =>
      chain({
        start_date: new Date('2026-12-02'),
        end_date: new Date('2026-12-05'),
      }),
    );
    await expect(service.submit(String(draft._id))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('auto-approves when the type does not require approval', async () => {
    leaveType.requires_approval = false;
    const result = await service.submit(String(draft._id));
    expect(result.state).toBe(LeaveState.APPROVED);
    expect(events.publish).toHaveBeenCalledWith(
      DomainEvents.LEAVE_APPROVED,
      expect.anything(),
    );
  });

  it('only decides from submitted (atomic precondition)', async () => {
    leaveModel.findOneAndUpdate.mockImplementation(() => chain(null));
    leaveModel.exists = jest
      .fn()
      .mockImplementation(() => chain({ _id: draft._id }));
    await expect(service.refuse(String(draft._id), {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(leaveModel.findOneAndUpdate.mock.calls[0][0].state).toBe(
      LeaveState.SUBMITTED,
    );
  });
});

describe('ShiftService.assertSchedulable', () => {
  const staffId = new Types.ObjectId();
  let shiftModel: any;
  let leaves: any;
  let service: ShiftService;

  beforeEach(() => {
    shiftModel = { findOne: jest.fn().mockImplementation(() => chain(null)) };
    leaves = { findApprovedLeaveOn: jest.fn().mockResolvedValue(null) };
    service = new ShiftService(
      shiftModel,
      {} as any,
      {} as any,
      {} as any,
      leaves,
    );
  });

  const timing = {
    date: new Date('2026-11-16'),
    starts_at: new Date('2026-11-16T22:00:00Z'),
    ends_at: new Date('2026-11-17T06:00:00Z'),
  };

  it('queries overlap with real start/end bounds (midnight crossing)', async () => {
    await service.assertSchedulable(staffId, timing);
    const filter = shiftModel.findOne.mock.calls[0][0];
    expect(filter.starts_at).toEqual({ $lt: timing.ends_at });
    expect(filter.ends_at).toEqual({ $gt: timing.starts_at });
    expect(filter.state).toEqual({ $ne: ShiftState.CANCELLED });
  });

  it('rejects an overlapping shift', async () => {
    shiftModel.findOne.mockImplementation(() =>
      chain({
        date: new Date('2026-11-17'),
        start_time: '05:00',
        end_time: '13:00',
      }),
    );
    await expect(
      service.assertSchedulable(staffId, timing),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a shift during approved leave', async () => {
    leaves.findApprovedLeaveOn.mockResolvedValue({ _id: new Types.ObjectId() });
    await expect(
      service.assertSchedulable(staffId, timing),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('buildWeekGrid', () => {
  it('groups shifts per staff and day with totals and leave days', () => {
    const a = new Types.ObjectId();
    const b = new Types.ObjectId();
    const grid = buildWeekGrid(
      'p',
      new Date('2026-11-16'),
      [
        {
          staff_id: a,
          date: new Date('2026-11-16'),
          start_time: '22:00',
          end_time: '06:00',
          hours: 8,
          state: ShiftState.PLANNED,
        },
        {
          staff_id: a,
          date: new Date('2026-11-17'),
          start_time: '22:00',
          end_time: '06:00',
          hours: 8,
          state: ShiftState.CONFIRMED,
        },
        {
          staff_id: a,
          date: new Date('2026-11-18'),
          start_time: '08:00',
          end_time: '12:00',
          hours: 4,
          state: ShiftState.CANCELLED,
        },
      ] as any,
      [
        { _id: a, position: 'Veilleur' },
        { _id: b, position: 'Réception' },
      ],
      [
        {
          staff_id: b,
          start_date: new Date('2026-11-21'),
          end_date: new Date('2026-11-25'),
        },
      ],
    );
    expect(grid.days).toHaveLength(7);
    expect(grid.end).toBe('2026-11-22');
    const rowA = grid.rows.find((r) => r.staff_id === String(a))!;
    expect(rowA.total_hours).toBe(16);
    expect(rowA.days['2026-11-16']).toHaveLength(1);
    const rowB = grid.rows.find((r) => r.staff_id === String(b))!;
    expect(rowB.leave_days).toEqual(['2026-11-21', '2026-11-22']);
    expect(grid.totals).toEqual({ shifts: 2, hours: 16 });
  });
});

describe('buildAttendanceReport', () => {
  it('compares worked vs planned hours per staff', () => {
    const a = new Types.ObjectId();
    const rows = buildAttendanceReport(
      [
        { staff_id: a, worked_hours: 7.5, is_open: false },
        { staff_id: a, worked_hours: 8.25, is_open: false },
      ],
      [
        { staff_id: a, hours: 8, state: ShiftState.PLANNED },
        { staff_id: a, hours: 8, state: ShiftState.CONFIRMED },
        { staff_id: a, hours: 8, state: ShiftState.CANCELLED },
      ],
    );
    expect(rows).toEqual([
      expect.objectContaining({
        attendances: 2,
        worked_hours: 15.75,
        planned_shifts: 2,
        planned_hours: 16,
        difference: -0.25,
      }),
    ]);
  });
});
