/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks Mongoose typés `any` */
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { LeadService } from './lead.service';
import { LeadState } from '../schemas/lead.entity';
import { DomainEvents } from '../../platform/events/domain-events';

const chain = (value: unknown) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

describe('LeadService', () => {
  const propertyId = new Types.ObjectId();
  const newStage = {
    _id: new Types.ObjectId(),
    name: 'Nouveau',
    probability: 10,
    is_won: false,
    is_lost: false,
  };
  const negStage = {
    _id: new Types.ObjectId(),
    name: 'Négociation',
    probability: 70,
    is_won: false,
    is_lost: false,
  };
  const wonStage = {
    _id: new Types.ObjectId(),
    name: 'Gagné',
    probability: 100,
    is_won: true,
    is_lost: false,
  };
  let lead: any;
  let model: any;
  let stages: any;
  let events: any;
  let service: LeadService;

  beforeEach(() => {
    lead = {
      _id: new Types.ObjectId(),
      property_id: propertyId,
      reference: 'PIS/2026/00001',
      title: 'Séminaire',
      stage_id: newStage._id,
      state: LeadState.OPEN,
      probability: 10,
      expected_revenue: 5_000_000,
    };
    const ModelMock: any = function (data: any) {
      return {
        _id: new Types.ObjectId(),
        ...data,
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };
    };
    ModelMock.findById = jest.fn().mockImplementation(() => chain(lead));
    ModelMock.findOneAndUpdate = jest
      .fn()
      .mockImplementation((_f: any, u: any) => chain({ ...lead, ...u.$set }));
    model = ModelMock;
    stages = {
      getForProperty: jest
        .fn()
        .mockImplementation((id: any) =>
          [newStage, negStage, wonStage].find(
            (s) => String(s._id) === String(id),
          ),
        ),
      getDefaultStage: jest.fn().mockResolvedValue(newStage),
      findClosingStage: jest.fn().mockResolvedValue(wonStage),
    };
    events = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new LeadService(
      model,
      {} as any,
      stages,
      { next: jest.fn().mockResolvedValue('PIS/2026/00002') } as any,
      events,
    );
  });

  it('creates with reference, default stage probability and room nights', async () => {
    const created: any = await service.create({
      property_id: String(propertyId),
      title: 'Mariage',
      rooms: 10,
      arrival_date: '2026-12-10',
      departure_date: '2026-12-12',
    });
    expect(created).toMatchObject({
      reference: 'PIS/2026/00002',
      probability: 10,
      room_nights: 20,
      state: LeadState.OPEN,
    });
    expect(events.publish).toHaveBeenCalledWith(
      DomainEvents.LEAD_CREATED,
      expect.anything(),
    );
  });

  it('keeps an overridden probability on create', async () => {
    const created: any = await service.create({
      property_id: String(propertyId),
      title: 'X',
      probability: 42,
    });
    expect(created.probability).toBe(42);
  });

  it('moves to an open stage with its probability and publishes LEAD_STAGE_CHANGED', async () => {
    const moved: any = await service.move(String(lead._id), {
      stage_id: String(negStage._id),
    });
    expect(moved.probability).toBe(70);
    expect(model.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
      stage_id: newStage._id,
      state: LeadState.OPEN,
    });
    expect(events.publish).toHaveBeenCalledWith(
      DomainEvents.LEAD_STAGE_CHANGED,
      expect.anything(),
    );
  });

  it('wins the lead when moved to a won stage', async () => {
    const moved: any = await service.move(String(lead._id), {
      stage_id: String(wonStage._id),
    });
    expect(moved.state).toBe(LeadState.WON);
    expect(moved.probability).toBe(100);
    const names = events.publish.mock.calls.map((c: any[]) => c[0]);
    expect(names).toEqual([
      DomainEvents.LEAD_STAGE_CHANGED,
      DomainEvents.LEAD_WON,
    ]);
  });

  it('loses with a reason', async () => {
    stages.findClosingStage.mockResolvedValue(null);
    const lost: any = await service.lose(String(lead._id), {
      reason: 'Budget',
    });
    expect(lost).toMatchObject({
      state: LeadState.LOST,
      lost_reason: 'Budget',
      probability: 0,
    });
    expect(events.publish).toHaveBeenCalledWith(
      DomainEvents.LEAD_LOST,
      expect.anything(),
    );
  });

  it('detects concurrent modification', async () => {
    model.findOneAndUpdate.mockImplementation(() => chain(null));
    await expect(service.win(String(lead._id))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
