import {
  averageDailyRate,
  averageLengthOfStay,
  cancellationRate,
  compareMetrics,
  computeKpis,
  occupancyRate,
  revPar,
  safeDivide,
  validateKpiInput,
  variation,
} from './kpi-calculator';
import { KpiMetric } from '../schemas/kpi.entity';

describe('kpi-calculator', () => {
  it('should guard division by zero, negatives and non finite values', () => {
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, -2)).toBe(0);
    expect(safeDivide(NaN, 2)).toBe(0);
    expect(safeDivide(10, Infinity)).toBe(0);
    expect(safeDivide(10, 4)).toBe(2.5);
  });

  it('should compute occupancy, ADR and RevPAR', () => {
    // 100 chambres disponibles, 75 vendues, 3 750 000 de CA hébergement
    expect(occupancyRate(75, 100)).toBe(75);
    expect(averageDailyRate(3_750_000, 75)).toBe(50_000);
    expect(revPar(3_750_000, 100)).toBe(37_500);
  });

  it('should verify RevPAR = ADR × occupancy', () => {
    const k = computeKpis({
      rooms_available: 310,
      rooms_sold: 217,
      room_revenue: 9_982_000,
    });
    expect(k.revpar).toBeCloseTo((k.adr * k.occupancy_rate) / 100, 0);
  });

  it('should return zeros when nothing is available or sold', () => {
    expect(
      computeKpis({ rooms_available: 0, rooms_sold: 0, room_revenue: 0 }),
    ).toEqual({
      occupancy_rate: 0,
      adr: 0,
      revpar: 0,
      trevpar: 0,
      goppar: null,
      cancellation_rate: 0,
      average_length_of_stay: 0,
    });
  });

  it('should compute secondary KPIs', () => {
    const k = computeKpis({
      rooms_available: 200,
      rooms_sold: 150,
      room_revenue: 6_000_000,
      total_revenue: 8_000_000,
      gross_operating_profit: -400_000,
      reservations_count: 50,
      cancellations_count: 5,
      stays_count: 60,
    });
    expect(k.trevpar).toBe(40_000);
    expect(k.goppar).toBe(-2_000);
    expect(k.cancellation_rate).toBe(10);
    expect(k.average_length_of_stay).toBe(2.5);
  });

  it('should fall back to room revenue for TRevPAR when total is missing', () => {
    expect(
      computeKpis({ rooms_available: 10, rooms_sold: 5, room_revenue: 1000 })
        .trevpar,
    ).toBe(100);
  });

  it('should round to 2 decimals', () => {
    expect(occupancyRate(1, 3)).toBe(33.33);
    expect(cancellationRate(2, 3)).toBe(66.67);
    expect(averageLengthOfStay(10, 3)).toBe(3.33);
  });

  it('should validate inconsistent inputs', () => {
    expect(
      validateKpiInput({ rooms_available: 10, rooms_sold: 5, room_revenue: 1 }),
    ).toEqual([]);
    const errors = validateKpiInput({
      rooms_available: 10,
      rooms_sold: 12,
      room_revenue: 100,
      total_revenue: 50,
      reservations_count: 1,
      cancellations_count: 2,
    });
    expect(errors).toHaveLength(3);
    expect(
      validateKpiInput({ rooms_available: -1, rooms_sold: 0, room_revenue: 0 }),
    ).toContain('rooms_available doit être un nombre positif');
  });

  describe('variation', () => {
    it('should compute absolute and relative variation', () => {
      expect(variation(110, 100)).toEqual({
        current: 110,
        previous: 100,
        absolute: 10,
        percent: 10,
        trend: 'up',
      });
      expect(variation(90, 100).trend).toBe('down');
      expect(variation(5, 5).trend).toBe('stable');
    });

    it('should return null percent when previous is zero', () => {
      expect(variation(50, 0)).toMatchObject({ absolute: 50, percent: null });
    });

    it('should handle negative previous values', () => {
      expect(variation(-50, -100).percent).toBe(50);
    });

    it('should return nulls when a value is missing', () => {
      expect(variation(10, null)).toEqual({
        current: 10,
        previous: null,
        absolute: null,
        percent: null,
        trend: null,
      });
    });
  });

  it('should compare metric records with no previous period', () => {
    const result = compareMetrics({ adr: 100 }, null, [KpiMetric.ADR]);
    expect(result.adr?.previous).toBeNull();
  });
});
