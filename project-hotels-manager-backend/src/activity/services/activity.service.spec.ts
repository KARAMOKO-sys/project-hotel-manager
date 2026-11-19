/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks typés `any` */
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ActivityService, buildTrackingValues } from './activity.service';
import { DOMAIN_EVENT_LABELS, labelForEvent } from '../activity-event-labels';
import {
  DOMAIN_EVENT_NAMES,
  DomainEvents,
} from '../../platform/events/domain-events';
import { RecordMessageType } from '../schemas/record-message.entity';
import { computeActivityStatus } from '../activity-status';
import { RecordActivityState } from '../schemas/record-activity.entity';

const execOf = (value: unknown) => ({
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

describe('libellés des événements', () => {
  it('couvre tout le catalogue', () => {
    for (const name of DOMAIN_EVENT_NAMES) {
      expect(DOMAIN_EVENT_LABELS[name]).toBeTruthy();
    }
    expect(labelForEvent('hotel.reservation.confirmed')).toBe(
      'Réservation confirmée',
    );
    expect(labelForEvent('inconnu.x')).toBe('inconnu.x');
  });
});

describe('computeActivityStatus', () => {
  const now = new Date(2026, 10, 17, 12);
  it('calcule overdue / today / planned', () => {
    const at = (d: number) => new Date(2026, 10, d, 9);
    expect(
      computeActivityStatus({ state: 'planned', due_date: at(16) }, now),
    ).toBe('overdue');
    expect(
      computeActivityStatus({ state: 'planned', due_date: at(17) }, now),
    ).toBe('today');
    expect(
      computeActivityStatus({ state: 'planned', due_date: at(18) }, now),
    ).toBe('planned');
    expect(
      computeActivityStatus(
        { state: RecordActivityState.DONE, due_date: at(1) },
        now,
      ),
    ).toBe('done');
  });
});

describe('ActivityService', () => {
  let service: ActivityService;
  let messageModel: any;
  let activityModel: any;
  let records: any;
  const eventIds = new Set<string>();

  const event = (overrides: Record<string, unknown> = {}): any => ({
    id: 'evt-1',
    name: DomainEvents.RESERVATION_CONFIRMED,
    occurred_at: new Date(),
    property_id: new Types.ObjectId().toString(),
    record: { model: 'Reservation', id: new Types.ObjectId().toString() },
    payload: { status: 'confirmed' },
    ...overrides,
  });

  beforeEach(() => {
    eventIds.clear();
    messageModel = {
      create: jest.fn().mockImplementation((doc: any) => {
        if (doc.event_id) {
          if (eventIds.has(doc.event_id)) {
            throw Object.assign(new Error('dup'), { code: 11000 });
          }
          eventIds.add(doc.event_id);
        }
        return { _id: new Types.ObjectId(), ...doc };
      }),
    };
    activityModel = {
      findOneAndUpdate: jest.fn().mockReturnValue(execOf(null)),
      exists: jest.fn().mockReturnValue(execOf({ _id: 'x' })),
    };
    records = {
      isAppInstalledForEvent: jest.fn().mockResolvedValue(true),
      toObjectId: (id: string) => new Types.ObjectId(id),
    };
    service = new ActivityService(
      messageModel,
      {} as any,
      activityModel,
      records,
    );
  });

  it('ajoute un message de suivi avec un libellé français', async () => {
    await expect(service.trackEvent(event())).resolves.toBe('created');
    const doc = messageModel.create.mock.calls[0][0];
    expect(doc.message_type).toBe(RecordMessageType.TRACKING);
    expect(doc.body).toBe('Réservation confirmée');
    expect(doc.event_id).toBe('evt-1');
    expect(doc.tracking_values).toEqual([
      { field: 'status', old: null, new: 'confirmed' },
    ]);
  });

  it('est idempotent par identifiant d’événement', async () => {
    const e = event();
    await service.trackEvent(e);
    await expect(service.trackEvent(e)).resolves.toBe('duplicate');
  });

  it('ignore les événements sans fiche, hors registre ou app non installée', async () => {
    await expect(
      service.trackEvent(event({ record: undefined })),
    ).resolves.toBe('skipped');
    await expect(
      service.trackEvent(
        event({
          record: { model: 'User', id: new Types.ObjectId().toString() },
        }),
      ),
    ).resolves.toBe('skipped');
    records.isAppInstalledForEvent.mockResolvedValue(false);
    await expect(service.trackEvent(event({ id: 'evt-2' }))).resolves.toBe(
      'skipped',
    );
    expect(messageModel.create).not.toHaveBeenCalled();
  });

  it("refuse de clôturer une activité qui n'est plus planifiée", async () => {
    await expect(
      service.markDone(new Types.ObjectId().toString(), {}, { id: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('déduit les valeurs suivies de la charge utile', () => {
    expect(buildTrackingValues({})).toBeUndefined();
    expect(
      buildTrackingValues({
        tracking_values: [{ field: 'stage', old: 'a', new: 'b' }, 'x'],
      }),
    ).toEqual([{ field: 'stage', old: 'a', new: 'b' }]);
  });
});
