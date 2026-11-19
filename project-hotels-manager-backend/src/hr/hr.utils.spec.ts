import { BadRequestException } from '@nestjs/common';
import {
  assertSufficientBalance,
  computeLeaveBalance,
  computeLeaveDays,
  computeWorkedHours,
  dateRangesOverlap,
  escapeRegex,
  intervalsOverlap,
  shiftHours,
  shiftInterval,
} from './hr.utils';

describe('hr.utils', () => {
  describe('computeLeaveDays', () => {
    // 2026-11-16 est un lundi.
    it('counts Monday to Saturday by default (hotels work Saturdays)', () => {
      expect(computeLeaveDays({ start: '2026-11-16', end: '2026-11-22' })).toBe(
        6,
      );
    });

    it('honours a configurable working week', () => {
      expect(
        computeLeaveDays({
          start: '2026-11-16',
          end: '2026-11-22',
          workingDays: [1, 2, 3, 4, 5],
        }),
      ).toBe(5);
    });

    it('excludes public holidays', () => {
      expect(
        computeLeaveDays({
          start: '2026-11-16',
          end: '2026-11-22',
          holidays: ['2026-11-18'],
        }),
      ).toBe(5);
    });

    it('handles half days on first and last days', () => {
      expect(
        computeLeaveDays({
          start: '2026-11-16',
          end: '2026-11-18',
          startHalfDay: true,
          endHalfDay: true,
        }),
      ).toBe(2);
    });

    it('counts a single half day as 0.5', () => {
      expect(
        computeLeaveDays({
          start: '2026-11-16',
          end: '2026-11-16',
          startHalfDay: true,
        }),
      ).toBe(0.5);
    });

    it('ignores a half day falling on a non-working day', () => {
      // 2026-11-22 est un dimanche.
      expect(
        computeLeaveDays({
          start: '2026-11-20',
          end: '2026-11-22',
          endHalfDay: true,
        }),
      ).toBe(2);
    });

    it('rejects an end before the start', () => {
      expect(() =>
        computeLeaveDays({ start: '2026-11-20', end: '2026-11-19' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('balance', () => {
    it('computes allocated − approved − pending', () => {
      expect(computeLeaveBalance(24, 10, 4)).toEqual({
        allocated: 24,
        approved: 10,
        pending: 4,
        remaining: 10,
      });
    });

    it('accepts a request equal to the remaining balance', () => {
      expect(() =>
        assertSufficientBalance(computeLeaveBalance(10, 5, 0), 5),
      ).not.toThrow();
    });

    it('rejects a request exceeding the balance', () => {
      expect(() =>
        assertSufficientBalance(computeLeaveBalance(10, 5, 2), 3.5),
      ).toThrow(BadRequestException);
    });
  });

  it('detects inclusive date range overlap', () => {
    const d = (s: string) => new Date(s);
    expect(
      dateRangesOverlap(
        d('2026-11-01'),
        d('2026-11-05'),
        d('2026-11-05'),
        d('2026-11-08'),
      ),
    ).toBe(true);
    expect(
      dateRangesOverlap(
        d('2026-11-01'),
        d('2026-11-04'),
        d('2026-11-05'),
        d('2026-11-08'),
      ),
    ).toBe(false);
  });

  describe('shifts', () => {
    it('computes a day shift', () => {
      const i = shiftInterval('2026-11-16', '08:00', '16:00');
      expect(i.start.toISOString()).toBe('2026-11-16T08:00:00.000Z');
      expect(i.end.toISOString()).toBe('2026-11-16T16:00:00.000Z');
      expect(shiftHours('08:00', '16:00')).toBe(8);
    });

    it('makes a night shift end the next day', () => {
      const i = shiftInterval('2026-11-16', '22:00', '06:00');
      expect(i.end.toISOString()).toBe('2026-11-17T06:00:00.000Z');
      expect(shiftHours('22:00', '06:00')).toBe(8);
    });

    it('detects overlap between a night shift and next morning shift', () => {
      const night = shiftInterval('2026-11-16', '22:00', '06:00');
      const morning = shiftInterval('2026-11-17', '05:00', '13:00');
      const later = shiftInterval('2026-11-17', '06:00', '14:00');
      expect(intervalsOverlap(night, morning)).toBe(true);
      expect(intervalsOverlap(night, later)).toBe(false);
    });

    it('does not consider back-to-back shifts as overlapping', () => {
      expect(
        intervalsOverlap(
          shiftInterval('2026-11-16', '08:00', '16:00'),
          shiftInterval('2026-11-16', '16:00', '23:00'),
        ),
      ).toBe(false);
    });

    it('rejects an invalid time', () => {
      expect(() => shiftHours('25:00', '06:00')).toThrow(BadRequestException);
    });
  });

  describe('computeWorkedHours', () => {
    it('computes hours with two decimals, across midnight', () => {
      expect(
        computeWorkedHours(
          new Date('2026-11-16T22:10:00Z'),
          new Date('2026-11-17T06:05:00Z'),
        ),
      ).toBe(7.92);
    });

    it('rejects a check-out before check-in', () => {
      expect(() =>
        computeWorkedHours(
          new Date('2026-11-16T10:00:00Z'),
          new Date('2026-11-16T09:00:00Z'),
        ),
      ).toThrow(BadRequestException);
    });
  });

  it('escapes regex metacharacters', () => {
    expect(new RegExp(escapeRegex('a.b*(c)')).test('a.b*(c)')).toBe(true);
    expect(new RegExp(escapeRegex('a.b')).test('axb')).toBe(false);
  });
});
