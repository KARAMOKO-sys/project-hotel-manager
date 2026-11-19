import { BadRequestException } from '@nestjs/common';
import { LoyaltyTier } from '../base-entities/enums/loyalty-tier.enum';
import {
  assertRedeemable,
  computeEarnPoints,
  expiryDate,
  planFifoConsumption,
  pointsValue,
  readAmount,
  resolveTier,
  tierMultiplier,
} from './loyalty.utils';

const tiers = [
  { tier: LoyaltyTier.BRONZE, min_lifetime_points: 0, earn_multiplier: 1 },
  {
    tier: LoyaltyTier.SILVER,
    min_lifetime_points: 1000,
    earn_multiplier: 1.25,
  },
  { tier: LoyaltyTier.GOLD, min_lifetime_points: 5000, earn_multiplier: 1.5 },
  {
    tier: LoyaltyTier.PLATINUM,
    min_lifetime_points: 15000,
    earn_multiplier: 2,
  },
];
const rules = { earn_unit_amount: 1000, points_per_unit: 1, tiers };

describe('loyalty.utils', () => {
  describe('computeEarnPoints', () => {
    it('earns 1 point per 1 000 XOF at bronze', () => {
      expect(computeEarnPoints(125_000, rules, LoyaltyTier.BRONZE)).toBe(125);
    });

    it('applies the tier multiplier and floors', () => {
      expect(computeEarnPoints(125_000, rules, LoyaltyTier.GOLD)).toBe(187);
      expect(computeEarnPoints(125_000, rules, LoyaltyTier.PLATINUM)).toBe(250);
    });

    it('returns 0 for small, negative or invalid amounts', () => {
      expect(computeEarnPoints(999, rules, LoyaltyTier.BRONZE)).toBe(0);
      expect(computeEarnPoints(-5000, rules, LoyaltyTier.BRONZE)).toBe(0);
      expect(computeEarnPoints(Number.NaN, rules, LoyaltyTier.BRONZE)).toBe(0);
      expect(
        computeEarnPoints(
          5000,
          { ...rules, earn_unit_amount: 0 },
          LoyaltyTier.BRONZE,
        ),
      ).toBe(0);
    });

    it('tolerates floating point rounding', () => {
      expect(
        computeEarnPoints(
          3000,
          { earn_unit_amount: 1000, points_per_unit: 0.1 * 10 },
          LoyaltyTier.BRONZE,
        ),
      ).toBe(3);
    });

    it('defaults to multiplier 1 for a tier without rule', () => {
      expect(tierMultiplier([], LoyaltyTier.GOLD)).toBe(1);
      expect(
        computeEarnPoints(
          10_000,
          { earn_unit_amount: 1000, points_per_unit: 2 },
          LoyaltyTier.GOLD,
        ),
      ).toBe(20);
    });
  });

  describe('resolveTier', () => {
    it('picks the highest reached threshold', () => {
      expect(resolveTier(tiers, 0)).toBe(LoyaltyTier.BRONZE);
      expect(resolveTier(tiers, 999)).toBe(LoyaltyTier.BRONZE);
      expect(resolveTier(tiers, 1000)).toBe(LoyaltyTier.SILVER);
      expect(resolveTier(tiers, 14_999)).toBe(LoyaltyTier.GOLD);
      expect(resolveTier(tiers, 50_000)).toBe(LoyaltyTier.PLATINUM);
    });

    it('is order-independent and defaults to bronze', () => {
      expect(resolveTier([...tiers].reverse(), 6000)).toBe(LoyaltyTier.GOLD);
      expect(resolveTier(undefined, 10_000)).toBe(LoyaltyTier.BRONZE);
    });
  });

  describe('assertRedeemable', () => {
    it('accepts a valid redemption', () => {
      expect(() => assertRedeemable(500, 100, 800)).not.toThrow();
    });

    it('rejects below the minimum', () => {
      expect(() => assertRedeemable(50, 100, 800)).toThrow(BadRequestException);
    });

    it('rejects above the balance', () => {
      expect(() => assertRedeemable(900, 100, 800)).toThrow(
        BadRequestException,
      );
    });

    it('rejects non-positive or fractional points', () => {
      expect(() => assertRedeemable(0, 0)).toThrow(BadRequestException);
      expect(() => assertRedeemable(1.5, 0)).toThrow(BadRequestException);
    });
  });

  it('computes the monetary value of points', () => {
    expect(pointsValue(250, 5)).toBe(1250);
    expect(pointsValue(3, 0.333)).toBe(1);
  });

  it('computes expiry dates', () => {
    expect(
      expiryDate(new Date('2026-01-31T00:00:00Z'), 12)?.toISOString(),
    ).toBe('2027-01-31T00:00:00.000Z');
    expect(expiryDate(new Date(), 0)).toBeUndefined();
  });

  it('plans FIFO consumption over oldest lots first', () => {
    const plan = planFifoConsumption(
      [
        { _id: 'a', remaining_points: 100 },
        { _id: 'b', remaining_points: 50 },
        { _id: 'c', remaining_points: 200 },
      ],
      170,
    );
    expect(plan.allocations).toEqual([
      { lot_id: 'a', points: 100 },
      { lot_id: 'b', points: 50 },
      { lot_id: 'c', points: 20 },
    ]);
    expect(plan.uncovered).toBe(0);
    expect(
      planFifoConsumption([{ _id: 'a', remaining_points: 10 }], 15).uncovered,
    ).toBe(5);
  });

  it('reads money objects and numbers', () => {
    expect(readAmount({ amount: 150000, currency: 'XOF' })).toEqual({
      amount: 150000,
      currency: 'XOF',
    });
    expect(readAmount(42)).toEqual({ amount: 42 });
    expect(readAmount(undefined)).toEqual({ amount: 0 });
  });
});
