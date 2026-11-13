import {
  addMonthsUtc,
  computeNextRun,
  defaultPeriod,
  exportFileName,
  formatCsvCell,
  inferColumns,
  summarizeRows,
  toCsv,
} from './report-builder';
import { ReportRecurrence, ReportType } from '../schemas/report.entity';

describe('report-builder', () => {
  const rows = [
    { date: '2026-10-01', occupancy: 80, revenue: 1000, note: 'ok' },
    { date: '2026-10-02', occupancy: 60, revenue: 500 },
  ];

  it('should infer columns in order of appearance', () => {
    expect(inferColumns([{ a: 1 }, { b: 2, a: 3 }])).toEqual(['a', 'b']);
    expect(inferColumns([])).toEqual([]);
  });

  it('should summarize numeric columns only', () => {
    const s = summarizeRows(rows);
    expect(s.row_count).toBe(2);
    expect(Object.keys(s.numeric_columns)).toEqual(['occupancy', 'revenue']);
    expect(s.numeric_columns.revenue).toEqual({
      total: 1500,
      average: 750,
      min: 500,
      max: 1000,
    });
  });

  it('should ignore mixed-type columns and handle empty rows', () => {
    expect(summarizeRows([{ x: 1 }, { x: 'a' }]).numeric_columns).toEqual({});
    expect(summarizeRows([])).toEqual({ row_count: 0, numeric_columns: {} });
  });

  describe('CSV', () => {
    it('should escape delimiters, quotes and newlines', () => {
      expect(formatCsvCell('a,b')).toBe('"a,b"');
      expect(formatCsvCell('say "hi"')).toBe('"say ""hi"""');
      expect(formatCsvCell('l1\nl2')).toBe('"l1\nl2"');
      expect(formatCsvCell('a;b', ';')).toBe('"a;b"');
    });

    it('should neutralise formula injection', () => {
      expect(formatCsvCell('=SUM(A1)')).toBe("'=SUM(A1)");
      expect(formatCsvCell(-5)).toBe('-5');
    });

    it('should format dates, objects and empty values', () => {
      expect(formatCsvCell(new Date('2026-01-01T00:00:00Z'))).toBe(
        '2026-01-01T00:00:00.000Z',
      );
      expect(formatCsvCell({ a: 1 })).toBe('"{""a"":1}"');
      expect(formatCsvCell(null)).toBe('');
      expect(formatCsvCell(undefined)).toBe('');
    });

    it('should serialise rows with header and CRLF', () => {
      expect(toCsv(rows, ['date', 'revenue', 'note'])).toBe(
        'date,revenue,note\r\n2026-10-01,1000,ok\r\n2026-10-02,500,',
      );
    });

    it('should support Excel-friendly output', () => {
      const csv = toCsv([{ a: 1, b: 2 }], undefined, {
        delimiter: ';',
        bom: true,
      });
      expect(csv).toBe('﻿a;b\r\n1;2');
    });

    it('should output only the header for no rows', () => {
      expect(toCsv([], ['a', 'b'])).toBe('a,b');
    });
  });

  describe('scheduling', () => {
    const from = new Date('2026-01-31T08:00:00Z');

    it('should compute next runs', () => {
      expect(computeNextRun(from, ReportRecurrence.DAILY).toISOString()).toBe(
        '2026-02-01T08:00:00.000Z',
      );
      expect(computeNextRun(from, ReportRecurrence.WEEKLY).toISOString()).toBe(
        '2026-02-07T08:00:00.000Z',
      );
    });

    it('should clamp monthly runs to the end of shorter months', () => {
      expect(computeNextRun(from, ReportRecurrence.MONTHLY).toISOString()).toBe(
        '2026-02-28T08:00:00.000Z',
      );
    });

    it('should handle leap years for yearly runs', () => {
      expect(
        computeNextRun(
          new Date('2028-02-29T00:00:00Z'),
          ReportRecurrence.YEARLY,
        ).toISOString(),
      ).toBe('2029-02-28T00:00:00.000Z');
    });

    it('should cross year boundaries when adding months', () => {
      expect(
        addMonthsUtc(new Date('2026-12-15T00:00:00Z'), 1).toISOString(),
      ).toBe('2027-01-15T00:00:00.000Z');
    });

    it('should throw on unknown recurrence', () => {
      expect(() =>
        computeNextRun(from, 'hourly' as ReportRecurrence),
      ).toThrow();
    });
  });

  describe('defaultPeriod', () => {
    const ref = new Date('2026-02-14T15:00:00Z');

    it('should compute daily, monthly and annual periods', () => {
      expect(defaultPeriod(ReportType.DAILY, ref)?.start.toISOString()).toBe(
        '2026-02-14T00:00:00.000Z',
      );
      expect(defaultPeriod(ReportType.MONTHLY, ref)?.end.toISOString()).toBe(
        '2026-02-28T23:59:59.999Z',
      );
      expect(defaultPeriod(ReportType.ANNUAL, ref)?.end.toISOString()).toBe(
        '2026-12-31T23:59:59.999Z',
      );
    });

    it('should return null for types without implicit period', () => {
      expect(defaultPeriod(ReportType.FINANCIAL, ref)).toBeNull();
    });
  });

  it('should build a safe export file name', () => {
    expect(
      exportFileName(
        'Rapport d’occupation – Été',
        new Date('2026-07-01'),
        'csv',
      ),
    ).toBe('rapport-d-occupation-ete-2026-07-01.csv');
    expect(exportFileName('***', new Date('2026-07-01'), 'json')).toBe(
      'rapport-2026-07-01.json',
    );
  });
});
