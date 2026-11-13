/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-floating-promises -- assertions sur les mocks jest du service */
import { Test, TestingModule } from '@nestjs/testing';
import { BlockedDateController } from './blocked-date.controller';
import { BlockedDateService } from '../services/blocked-date.service';

describe('BlockedDateController', () => {
  let controller: BlockedDateController;
  let service: jest.Mocked<BlockedDateService>;

  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockedDateController],
      providers: [
        {
          provide: BlockedDateService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            unblock: jest.fn(),
            getBlockedDates: jest.fn(),
            isBlocked: jest.fn(),
            findByRoom: jest.fn(),
            findByProperty: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BlockedDateController>(BlockedDateController);
    service = module.get(BlockedDateService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to the service', () => {
    const dto = {
      property_id: propertyId,
      start_date: '2026-11-01',
      end_date: '2026-11-02',
    };
    controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should delegate unblock to the service', () => {
    controller.unblock({ id });
    expect(service.unblock).toHaveBeenCalledWith(id);
  });

  it('should pass the range and target to getBlockedDates', () => {
    controller.getBlockedDates(propertyId, {
      start_date: '2026-11-01',
      end_date: '2026-11-30',
      room_id: id,
    });
    expect(service.getBlockedDates).toHaveBeenCalledWith(
      propertyId,
      '2026-11-01',
      '2026-11-30',
      { roomId: id, roomTypeId: undefined },
    );
  });

  it('should wrap isBlocked result', async () => {
    service.isBlocked.mockResolvedValue(true);
    await expect(
      controller.isBlocked(propertyId, {
        start_date: '2026-11-01',
        end_date: '2026-11-02',
      }),
    ).resolves.toEqual({ blocked: true });
  });
});
