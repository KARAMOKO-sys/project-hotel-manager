/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return --
   Le modèle Mongoose est simulé par un objet jest non typé : ces règles ne s'appliquent pas aux mocks. */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ReportService } from './report.service';
import {
  Report,
  ReportFormat,
  ReportRecurrence,
  ReportStatus,
  ReportType,
} from '../schemas/report.entity';

describe('ReportService', () => {
  let service: ReportService;
  let model: any;
  let findChain: any;
  let existing: any;

  const propertyId = new Types.ObjectId().toString();

  beforeEach(async () => {
    existing = {
      _id: new Types.ObjectId(),
      property_id: new Types.ObjectId(propertyId),
      name: 'Occupation octobre',
      type: ReportType.MONTHLY,
      period_start: new Date('2026-10-01T00:00:00Z'),
      period_end: new Date('2026-10-31T23:59:59.999Z'),
      status: ReportStatus.DRAFT,
      format: ReportFormat.CSV,
      columns: [],
      data: {},
    };
    findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    const ModelMock: any = function (data: any) {
      const doc = { _id: existing._id, ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.find = jest.fn().mockReturnValue(findChain);
    ModelMock.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
    ModelMock.findById = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(existing),
    }));
    ModelMock.findByIdAndUpdate = jest.fn().mockImplementation((_id, data) => ({
      exec: jest
        .fn()
        .mockResolvedValue({ ...existing, ...(data.$set ?? data) }),
    }));
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: getModelToken(Report.name), useValue: model },
      ],
    }).compile();

    service = module.get(ReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should derive the period of a monthly report', async () => {
      const result = await service.create({
        property_id: propertyId,
        name: 'Mensuel',
        type: ReportType.MONTHLY,
        reference_date: '2026-02-10',
      });
      expect(result.period_start.toISOString()).toBe(
        '2026-02-01T00:00:00.000Z',
      );
      expect(result.status).toBe(ReportStatus.DRAFT);
      expect((result as any).reference_date).toBeUndefined();
    });

    it('should require an explicit period for financial reports', async () => {
      await expect(
        service.create({
          property_id: propertyId,
          name: 'Financier',
          type: ReportType.FINANCIAL,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an inverted period', async () => {
      await expect(
        service.create({
          property_id: propertyId,
          name: 'X',
          type: ReportType.CUSTOM,
          period_start: '2026-02-01',
          period_end: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generate', () => {
    it('should store rows, columns and summary', async () => {
      const result = await service.generate(existing._id.toString(), {
        rows: [
          { day: '2026-10-01', revenue: 100 },
          { day: '2026-10-02', revenue: 300 },
        ],
      });
      expect(result.status).toBe(ReportStatus.COMPLETED);
      expect(result.columns).toEqual(['day', 'revenue']);
      expect(result.summary.numeric_columns.revenue.total).toBe(400);
      const update = model.findByIdAndUpdate.mock.calls[0][1];
      expect(update.$inc).toEqual({ generation_count: 1 });
      expect(update.$unset).toEqual({ error_message: 1 });
    });

    it('should accept empty rows', async () => {
      const result = await service.generate(existing._id.toString(), {
        rows: [],
      });
      expect(result.summary.row_count).toBe(0);
    });

    it('should advance the schedule of a recurring report', async () => {
      existing.schedule = {
        recurrence: ReportRecurrence.DAILY,
        is_active: true,
        recipients: [],
      };
      await service.generate(existing._id.toString(), { rows: [] });
      const update = model.findByIdAndUpdate.mock.calls[0][1];
      expect(update.$set['schedule.next_run_at']).toBeInstanceOf(Date);
      expect(update.$set['schedule.last_run_at']).toBeInstanceOf(Date);
    });

    it('should reject invalid rows', async () => {
      await expect(
        service.generate(existing._id.toString(), { rows: [1 as any] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw 404 for unknown reports', async () => {
      existing = null;
      await expect(
        service.generate(new Types.ObjectId().toString(), { rows: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it('should create and generate in one call', async () => {
    const result = await service.createAndGenerate({
      property_id: propertyId,
      name: 'Journalier',
      type: ReportType.DAILY,
      rows: [{ a: 1 }],
    });
    expect(result.status).toBe(ReportStatus.COMPLETED);
  });

  describe('export', () => {
    beforeEach(() => {
      Object.assign(existing, {
        status: ReportStatus.COMPLETED,
        generated_at: new Date(),
        columns: ['day', 'note'],
        data: { rows: [{ day: '2026-10-01', note: 'a,b' }] },
        summary: { row_count: 1 },
      });
    });

    it('should export CSV', async () => {
      const file = await service.export(existing._id.toString());
      expect(file.filename).toBe('occupation-octobre-2026-10-01.csv');
      expect(file.content_type).toContain('text/csv');
      expect(file.content).toBe('day,note\r\n2026-10-01,"a,b"');
    });

    it('should export Excel-compatible CSV', async () => {
      const file = await service.export(
        existing._id.toString(),
        ReportFormat.EXCEL,
      );
      expect(file.content.startsWith('﻿day;note')).toBe(true);
    });

    it('should export JSON', async () => {
      const file = await service.export(
        existing._id.toString(),
        ReportFormat.JSON,
      );
      expect(JSON.parse(file.content).rows).toHaveLength(1);
    });

    it('should refuse PDF export for now', async () => {
      await expect(
        service.export(existing._id.toString(), ReportFormat.PDF),
      ).rejects.toThrow(NotImplementedException);
    });

    it('should refuse exporting a report that was not generated', async () => {
      existing.status = ReportStatus.DRAFT;
      await expect(service.export(existing._id.toString())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('scheduling', () => {
    it('should schedule a draft report', async () => {
      const result = await service.schedule(existing._id.toString(), {
        recurrence: ReportRecurrence.MONTHLY,
        recipients: ['dg@hotel.com'],
      });
      expect(result.status).toBe(ReportStatus.SCHEDULED);
      expect(result.schedule?.is_active).toBe(true);
      expect(result.schedule?.next_run_at!.getTime()).toBeGreaterThan(
        Date.now(),
      );
    });

    it('should reject a start date in the past', async () => {
      await expect(
        service.schedule(existing._id.toString(), {
          recurrence: ReportRecurrence.DAILY,
          start_at: '2000-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should unschedule and restore the status', async () => {
      existing.status = ReportStatus.SCHEDULED;
      existing.schedule = {
        recurrence: ReportRecurrence.DAILY,
        is_active: true,
        recipients: [],
      };
      const result = await service.unschedule(existing._id.toString());
      expect(result.status).toBe(ReportStatus.DRAFT);
      const update = model.findByIdAndUpdate.mock.calls[0][1];
      expect(update.$set['schedule.is_active']).toBe(false);
      expect(update.$unset).toEqual({ 'schedule.next_run_at': 1 });
    });

    it('should refuse to unschedule a non-scheduled report', async () => {
      await expect(service.unschedule(existing._id.toString())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should list due reports', async () => {
      const at = new Date('2026-10-06T00:00:00Z');
      await service.getDueReports(at);
      expect(model.find.mock.calls[0][0]['schedule.next_run_at']).toEqual({
        $lte: at,
      });
    });
  });

  it('should mark a report as failed', async () => {
    const result = await service.markFailed(existing._id.toString(), 'boom');
    expect(result.status).toBe(ReportStatus.FAILED);
    expect(result.error_message).toBe('boom');
  });

  it('should validate the period on update', async () => {
    await expect(
      service.update(existing._id.toString(), { period_end: '2026-09-01' }),
    ).rejects.toThrow(BadRequestException);
  });
});
