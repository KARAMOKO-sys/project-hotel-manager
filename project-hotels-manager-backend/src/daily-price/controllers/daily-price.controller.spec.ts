/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-floating-promises -- assertions sur les mocks jest du service */
import { Test, TestingModule } from '@nestjs/testing';
import { DailyPriceController } from './daily-price.controller';
import { DailyPriceService } from '../services/daily-price.service';

describe('DailyPriceController', () => {
  let controller: DailyPriceController;
  let service: jest.Mocked<DailyPriceService>;

  const roomTypeId = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyPriceController],
      providers: [
        {
          provide: DailyPriceService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            setPrice: jest.fn(),
            bulkSetPrices: jest.fn(),
            getCalendar: jest.fn(),
            getPriceForDate: jest.fn(),
            calculateStayPrice: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DailyPriceController>(DailyPriceController);
    service = module.get(DailyPriceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate bulk set', () => {
    const dto = {
      property_id: propertyId,
      room_type_id: roomTypeId,
      start_date: '2026-12-20',
      end_date: '2026-12-31',
      price: { amount: 75000 },
    };
    controller.bulkSetPrices(dto);
    expect(service.bulkSetPrices).toHaveBeenCalledWith(dto);
  });

  it('should delegate calendar with the range', () => {
    controller.getCalendar(roomTypeId, {
      start_date: '2026-12-01',
      end_date: '2026-12-31',
    });
    expect(service.getCalendar).toHaveBeenCalledWith(
      roomTypeId,
      '2026-12-01',
      '2026-12-31',
      undefined,
    );
  });

  it('should delegate stay price computation', () => {
    controller.calculateStayPrice(roomTypeId, {
      check_in: '2026-12-01',
      check_out: '2026-12-04',
      rate_plan_id: propertyId,
    });
    expect(service.calculateStayPrice).toHaveBeenCalledWith(
      roomTypeId,
      '2026-12-01',
      '2026-12-04',
      propertyId,
    );
  });
});
