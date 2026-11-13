/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-floating-promises -- assertions sur les mocks jest du service */
import { Test, TestingModule } from '@nestjs/testing';
import { RatePlanController } from './rate-plan.controller';
import { RatePlanService } from '../services/rate-plan.service';

describe('RatePlanController', () => {
  let controller: RatePlanController;
  let service: jest.Mocked<RatePlanService>;

  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatePlanController],
      providers: [
        {
          provide: RatePlanService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByProperty: jest.fn(),
            findApplicable: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
            calculateCancellationFee: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RatePlanController>(RatePlanController);
    service = module.get(RatePlanService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate findApplicable', () => {
    const query = { check_in: '2026-11-01', check_out: '2026-11-03' };
    controller.findApplicable(propertyId, query);
    expect(service.findApplicable).toHaveBeenCalledWith(propertyId, query);
  });

  it('should delegate activate / deactivate', () => {
    controller.activate({ id });
    controller.deactivate({ id });
    expect(service.activate).toHaveBeenCalledWith(id);
    expect(service.deactivate).toHaveBeenCalledWith(id);
  });

  it('should delegate the cancellation fee computation', () => {
    controller.calculateCancellationFee(
      { id },
      {
        total_amount: 100,
        check_in: '2026-11-01',
        cancelled_at: '2026-10-30',
      },
    );
    expect(service.calculateCancellationFee).toHaveBeenCalledWith(
      id,
      100,
      '2026-11-01',
      '2026-10-30',
    );
  });
});
