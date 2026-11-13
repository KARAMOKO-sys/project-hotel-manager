import { Test, TestingModule } from '@nestjs/testing';
import { ReportController } from './report.controller';
import { ReportService } from '../services/report.service';
import { ReportFormat } from '../schemas/report.entity';
import type { Response } from 'express';

describe('ReportController', () => {
  let controller: ReportController;
  let service: Record<string, jest.Mock>;
  const id = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        {
          provide: ReportService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            createAndGenerate: jest.fn(),
            generate: jest.fn(),
            export: jest.fn().mockResolvedValue({
              filename: 'r.csv',
              content_type: 'text/csv',
              content: 'a,b',
            }),
            schedule: jest.fn(),
            unschedule: jest.fn(),
            getDueReports: jest.fn(),
            findByProperty: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ReportController);
    service = module.get<ReportService, Record<string, jest.Mock>>(
      ReportService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should set download headers on export', async () => {
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const content = await controller.export(
      { id },
      { format: ReportFormat.CSV },
      res,
    );
    expect(content).toBe('a,b');
    expect(service.export).toHaveBeenCalledWith(id, ReportFormat.CSV);
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="r.csv"',
    );
  });

  it('should delegate generate', () => {
    void controller.generate({ id }, { rows: [] });
    expect(service.generate).toHaveBeenCalledWith(id, { rows: [] });
  });

  it('should parse the due date', () => {
    void controller.getDueReports({ at: '2026-10-06' });
    expect(service.getDueReports).toHaveBeenCalledWith(new Date('2026-10-06'));
  });
});
