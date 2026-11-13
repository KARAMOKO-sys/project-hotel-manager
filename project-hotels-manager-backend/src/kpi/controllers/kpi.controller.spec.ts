import { Test, TestingModule } from '@nestjs/testing';
import { KpiController } from './kpi.controller';
import { KpiService } from '../services/kpi.service';
import { KpiMetric, KpiPeriodType } from '../schemas/kpi.entity';

describe('KpiController', () => {
  let controller: KpiController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KpiController],
      providers: [
        {
          provide: KpiService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            calculate: jest.fn(),
            comparePeriods: jest.fn(),
            findByProperty: jest.fn(),
            getLatest: jest.fn(),
            getTrend: jest.fn(),
            compareWithPrevious: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(KpiController);
    service = module.get<KpiService, Record<string, jest.Mock>>(KpiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate calculate', () => {
    const input = { rooms_available: 1, rooms_sold: 1, room_revenue: 1 };
    void controller.calculate(input);
    expect(service.calculate).toHaveBeenCalledWith(input);
  });

  it('should delegate getLatest with the period type', () => {
    void controller.getLatest('p', { period_type: KpiPeriodType.MONTHLY });
    expect(service.getLatest).toHaveBeenCalledWith('p', KpiPeriodType.MONTHLY);
  });

  it('should delegate getTrend', () => {
    void controller.getTrend('p', { metric: KpiMetric.REVPAR });
    expect(service.getTrend).toHaveBeenCalledWith('p', {
      metric: KpiMetric.REVPAR,
    });
  });
});
