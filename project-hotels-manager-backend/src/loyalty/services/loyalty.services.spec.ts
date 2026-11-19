/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks Mongoose typés `any` */
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { LoyaltyAccountService } from './loyalty-account.service';
import { LoyaltyListener } from './loyalty.listener';
import { LoyaltyTier } from '../../base-entities/enums/loyalty-tier.enum';
import { DomainEvents } from '../../platform/events/domain-events';
import { LoyaltyTransactionType } from '../schemas/loyalty-transaction.entity';

const chain = (value: unknown) => ({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

const program = (overrides: Record<string, unknown> = {}): any => ({
  _id: new Types.ObjectId(),
  property_id: new Types.ObjectId(),
  name: 'PleasantStay Rewards',
  currency: 'XOF',
  earn_unit_amount: 1000,
  points_per_unit: 1,
  point_value: 5,
  min_redeem_points: 100,
  points_expiry_months: 12,
  tiers: [
    { tier: LoyaltyTier.BRONZE, min_lifetime_points: 0, earn_multiplier: 1 },
    {
      tier: LoyaltyTier.SILVER,
      min_lifetime_points: 1000,
      earn_multiplier: 1.5,
    },
  ],
  earn_on_reservation: true,
  earn_on_pos: false,
  is_active: true,
  ...overrides,
});

describe('LoyaltyAccountService', () => {
  let prog: any;
  let account: any;
  let accountModel: any;
  let txModel: any;
  let programModel: any;
  let guests: any;
  let events: any;
  let service: LoyaltyAccountService;

  beforeEach(() => {
    prog = program();
    account = {
      _id: new Types.ObjectId(),
      program_id: prog._id,
      guest_id: new Types.ObjectId(),
      property_id: prog.property_id,
      balance: 900,
      lifetime_points: 900,
      tier: LoyaltyTier.BRONZE,
      is_active: true,
    };
    accountModel = {
      findById: jest.fn().mockImplementation(() => chain(account)),
      findOneAndUpdate: jest
        .fn()
        .mockImplementation((filter: any, update: any) => {
          if (update.$setOnInsert) return chain(account);
          if (
            filter.balance?.$gte !== undefined &&
            account.balance < filter.balance.$gte
          )
            return chain(null);
          for (const [k, v] of Object.entries(update.$inc ?? {}))
            account[k] = (account[k] ?? 0) + (v as number);
          Object.assign(account, update.$set ?? {});
          return chain({ ...account });
        }),
    };
    txModel = {
      create: jest
        .fn()
        .mockImplementation((doc: any) =>
          Promise.resolve({ _id: new Types.ObjectId(), ...doc }),
        ),
      find: jest.fn().mockImplementation(() => chain([])),
      updateOne: jest
        .fn()
        .mockImplementation(() => chain({ modifiedCount: 1 })),
    };
    programModel = { findOne: jest.fn().mockImplementation(() => chain(prog)) };
    guests = { updateOne: jest.fn().mockResolvedValue({}), findOne: jest.fn() };
    events = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new LoyaltyAccountService(
      accountModel,
      programModel,
      txModel,
      { collection: jest.fn().mockReturnValue(guests) } as any,
      events,
    );
  });

  describe('earn', () => {
    const source = {
      model: 'Reservation',
      id: 'r1',
      event: DomainEvents.RESERVATION_CHECKED_OUT,
    };

    it('credits points, upgrades the tier and syncs the guest', async () => {
      const result = await service.earn({
        program: prog,
        guestId: account.guest_id,
        amount: 250_000,
        source,
      });
      expect(result?.points).toBe(250);
      expect(txModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LoyaltyTransactionType.EARN,
          points: 250,
          remaining_points: 250,
          source,
        }),
      );
      expect(result?.tier_changed).toBe(true);
      const names = events.publish.mock.calls.map((c: any[]) => c[0]);
      expect(names).toEqual([
        DomainEvents.LOYALTY_TIER_CHANGED,
        DomainEvents.LOYALTY_POINTS_EARNED,
      ]);
      expect(guests.updateOne).toHaveBeenCalledWith(
        { _id: account.guest_id },
        {
          $set: expect.objectContaining({
            loyalty_points: 1150,
            loyalty_tier: LoyaltyTier.SILVER,
          }),
        },
      );
    });

    it('uses the current tier multiplier', async () => {
      account.tier = LoyaltyTier.SILVER;
      account.lifetime_points = 2000;
      const result = await service.earn({
        program: prog,
        guestId: account.guest_id,
        amount: 100_000,
        source,
      });
      expect(result?.points).toBe(150);
    });

    it('is idempotent: a replayed source credits nothing', async () => {
      txModel.create.mockRejectedValue(
        Object.assign(new Error('dup'), { code: 11000 }),
      );
      const result = await service.earn({
        program: prog,
        guestId: account.guest_id,
        amount: 250_000,
        source,
      });
      expect(result).toBeNull();
      expect(accountModel.findOneAndUpdate).toHaveBeenCalledTimes(1); // ensureAccount uniquement
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('credits nothing below one unit', async () => {
      expect(
        await service.earn({
          program: prog,
          guestId: account.guest_id,
          amount: 500,
          source,
        }),
      ).toBeNull();
      expect(txModel.create).not.toHaveBeenCalled();
    });
  });

  describe('redeem', () => {
    it('debits atomically and returns the monetary value', async () => {
      const result = await service.redeem(String(account._id), {
        points: 200,
        reason: 'Nuit offerte',
      });
      expect(result.value).toBe(1000);
      expect(result.account.balance).toBe(700);
      const [filter, update] = accountModel.findOneAndUpdate.mock.calls[0];
      expect(filter.balance).toEqual({ $gte: 200 });
      expect(update.$inc).toEqual({ balance: -200 });
      expect(events.publish).toHaveBeenCalledWith(
        DomainEvents.LOYALTY_POINTS_REDEEMED,
        expect.anything(),
      );
    });

    it('rejects below min_redeem_points', async () => {
      await expect(
        service.redeem(String(account._id), { points: 50, reason: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects above the balance', async () => {
      await expect(
        service.redeem(String(account._id), { points: 1000, reason: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('fails when the balance changed concurrently', async () => {
      accountModel.findOneAndUpdate.mockImplementation(() => chain(null));
      await expect(
        service.redeem(String(account._id), { points: 500, reason: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(txModel.create).not.toHaveBeenCalled();
    });

    it('consumes earn lots FIFO', async () => {
      txModel.find.mockImplementation(() =>
        chain([
          { _id: 'old', remaining_points: 150 },
          { _id: 'new', remaining_points: 500 },
        ]),
      );
      await service.redeem(String(account._id), { points: 200, reason: 'x' });
      expect(
        txModel.updateOne.mock.calls.map((c: any[]) => [
          c[0]._id,
          c[1].$inc.remaining_points,
        ]),
      ).toEqual([
        ['old', -150],
        ['new', -50],
      ]);
    });
  });

  it('requires a sufficient balance for a negative adjustment', async () => {
    await expect(
      service.adjust(String(account._id), { points: -5000, reason: 'Erreur' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('LoyaltyListener', () => {
  let apps: any;
  let tenant: any;
  let programs: any;
  let accounts: any;
  let listener: LoyaltyListener;
  const propertyId = new Types.ObjectId().toString();
  const orgId = new Types.ObjectId().toString();
  const guestId = new Types.ObjectId().toString();

  const reservationEvent = (): any => ({
    id: 'e1',
    name: DomainEvents.RESERVATION_CHECKED_OUT,
    occurred_at: new Date(),
    property_id: propertyId,
    record: { model: 'Reservation', id: 'res1' },
    payload: {
      _id: 'res1',
      guest_id: guestId,
      total_amount: { amount: 300_000, currency: 'XOF' },
    },
  });

  beforeEach(() => {
    apps = { isInstalled: jest.fn().mockResolvedValue(true) };
    tenant = {
      getOrganizationIdForProperty: jest.fn().mockResolvedValue(orgId),
    };
    programs = { findActiveFor: jest.fn().mockResolvedValue(program()) };
    accounts = { earn: jest.fn().mockResolvedValue({ points: 300 }) };
    listener = new LoyaltyListener(apps, tenant, programs, accounts);
  });

  it('earns on check-out with a stable idempotency source', async () => {
    await listener.onReservationCheckedOut(reservationEvent());
    await listener.onReservationCheckedOut(reservationEvent());
    expect(accounts.earn).toHaveBeenCalledTimes(2);
    const sources = accounts.earn.mock.calls.map((c: any[]) => c[0].source);
    expect(sources[0]).toEqual({
      model: 'Reservation',
      id: 'res1',
      event: DomainEvents.RESERVATION_CHECKED_OUT,
    });
    expect(sources[1]).toEqual(sources[0]);
    expect(accounts.earn.mock.calls[0][0].amount).toBe(300_000);
  });

  it('does nothing when the app is not installed', async () => {
    apps.isInstalled.mockResolvedValue(false);
    expect(
      await listener.onReservationCheckedOut(reservationEvent()),
    ).toBeNull();
    expect(accounts.earn).not.toHaveBeenCalled();
  });

  it('does nothing without an active program', async () => {
    programs.findActiveFor.mockResolvedValue(null);
    expect(
      await listener.onReservationCheckedOut(reservationEvent()),
    ).toBeNull();
  });

  it('skips a currency different from the program', async () => {
    const event = reservationEvent();
    event.payload.total_amount.currency = 'EUR';
    expect(await listener.onReservationCheckedOut(event)).toBeNull();
    expect(accounts.earn).not.toHaveBeenCalled();
  });

  it('earns on POS only when enabled and a guest is attached', async () => {
    const pos = (): any => ({
      name: DomainEvents.POS_TRANSACTION_COMPLETED,
      property_id: propertyId,
      record: { model: 'PosTransaction', id: 'pos1' },
      payload: {
        guest_id: guestId,
        total: 20_000,
        refunded_amount: 0,
        currency: 'XOF',
        status: 'completed',
      },
    });
    expect(await listener.onPosTransactionCompleted(pos())).toBeNull();
    programs.findActiveFor.mockResolvedValue(program({ earn_on_pos: true }));
    await listener.onPosTransactionCompleted(pos());
    expect(accounts.earn).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 20_000,
        source: {
          model: 'PosTransaction',
          id: 'pos1',
          event: DomainEvents.POS_TRANSACTION_COMPLETED,
        },
      }),
    );
    const noGuest = pos();
    delete noGuest.payload.guest_id;
    accounts.earn.mockClear();
    await listener.onPosTransactionCompleted(noGuest);
    expect(accounts.earn).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    accounts.earn.mockRejectedValue(new Error('boom'));
    await expect(
      listener.onReservationCheckedOut(reservationEvent()),
    ).resolves.toBeNull();
  });
});
