import { BadRequestException } from '@nestjs/common';
import {
  assertStayDates,
  computePipeline,
  computeRoomNights,
  weightedRevenue,
} from './crm.utils';

describe('crm.utils', () => {
  it('computes room nights = rooms × nights', () => {
    expect(computeRoomNights(20, '2026-12-10', '2026-12-13')).toBe(60);
    expect(computeRoomNights(5, undefined, '2026-12-13')).toBe(0);
  });

  it('rejects departure before arrival', () => {
    expect(() => assertStayDates('2026-12-10', '2026-12-10')).toThrow(
      BadRequestException,
    );
  });

  it('computes weighted revenue', () => {
    expect(
      weightedRevenue({ expected_revenue: 1_000_000, probability: 30 }),
    ).toBe(300_000);
    expect(weightedRevenue({ expected_revenue: 1000, probability: 150 })).toBe(
      1000,
    );
  });

  describe('computePipeline', () => {
    const stages = [
      {
        _id: 'won',
        name: 'Gagné',
        sequence: 90,
        probability: 100,
        is_won: true,
        is_lost: false,
      },
      {
        _id: 'new',
        name: 'Nouveau',
        sequence: 10,
        probability: 10,
        is_won: false,
        is_lost: false,
      },
      {
        _id: 'neg',
        name: 'Négociation',
        sequence: 40,
        probability: 70,
        is_won: false,
        is_lost: false,
      },
      {
        _id: 'lost',
        name: 'Perdu',
        sequence: 100,
        probability: 0,
        is_won: false,
        is_lost: true,
      },
    ];
    const leads = [
      {
        stage_id: 'new',
        state: 'open',
        expected_revenue: 1_000_000,
        probability: 10,
        arrival_date: '2026-12-05',
      },
      {
        stage_id: 'neg',
        state: 'open',
        expected_revenue: 2_000_000,
        probability: 50,
        arrival_date: '2026-12-20',
      },
      {
        stage_id: 'won',
        state: 'won',
        expected_revenue: 3_000_000,
        probability: 100,
        arrival_date: '2027-01-10',
      },
      {
        stage_id: 'lost',
        state: 'lost',
        expected_revenue: 500_000,
        probability: 0,
        arrival_date: '2026-12-01',
      },
      {
        stage_id: 'lost',
        state: 'lost',
        expected_revenue: 400_000,
        probability: 0,
      },
      {
        stage_id: 'new',
        state: 'open',
        expected_revenue: 100_000,
        probability: 20,
      },
    ];
    const report = computePipeline(stages, leads);

    it('orders stages by sequence with count / expected / weighted', () => {
      expect(report.stages.map((s) => s.stage_id)).toEqual([
        'new',
        'neg',
        'won',
        'lost',
      ]);
      expect(report.stages[0]).toMatchObject({
        count: 2,
        expected_revenue: 1_100_000,
        weighted_revenue: 120_000,
      });
      // probabilité propre à la piste (surchargée) et non celle de l'étape
      expect(report.stages[1]).toMatchObject({
        count: 1,
        weighted_revenue: 1_000_000,
      });
      expect(report.stages[2]).toMatchObject({
        count: 1,
        weighted_revenue: 3_000_000,
      });
      expect(report.stages[3]).toMatchObject({
        count: 2,
        expected_revenue: 900_000,
        weighted_revenue: 0,
      });
    });

    it('computes open totals and win rate', () => {
      expect(report.totals).toMatchObject({
        count: 6,
        open_count: 3,
        won_count: 1,
        lost_count: 2,
        expected_revenue: 3_100_000,
        weighted_revenue: 1_120_000,
        won_revenue: 3_000_000,
      });
      expect(report.win_rate).toBe(33.33);
    });

    it('forecasts by arrival month, excluding lost leads', () => {
      expect(report.forecast).toEqual([
        {
          month: '2026-12',
          count: 2,
          expected_revenue: 3_000_000,
          weighted_revenue: 1_100_000,
          won_revenue: 0,
        },
        {
          month: '2027-01',
          count: 1,
          expected_revenue: 0,
          weighted_revenue: 3_000_000,
          won_revenue: 3_000_000,
        },
        {
          month: 'unscheduled',
          count: 1,
          expected_revenue: 100_000,
          weighted_revenue: 20_000,
          won_revenue: 0,
        },
      ]);
    });

    it('returns a zero win rate without closed leads', () => {
      expect(computePipeline(stages, []).win_rate).toBe(0);
    });
  });
});
