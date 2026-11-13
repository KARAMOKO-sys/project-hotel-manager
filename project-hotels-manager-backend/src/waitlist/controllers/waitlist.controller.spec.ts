/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-floating-promises -- assertions sur les mocks jest du service */
import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from '../services/waitlist.service';
import { WaitlistStatus } from '../schemas/waitlist.entity';

describe('WaitlistController', () => {
  let controller: WaitlistController;
  let service: jest.Mocked<WaitlistService>;

  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaitlistController],
      providers: [
        {
          provide: WaitlistService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByProperty: jest.fn(),
            findByGuest: jest.fn(),
            getPosition: jest.fn(),
            notifyAvailable: jest.fn(),
            confirm: jest.fn(),
            convertToReservation: jest.fn(),
            cancel: jest.fn(),
            expireOverdue: jest.fn(),
            getStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WaitlistController>(WaitlistController);
    service = module.get(WaitlistService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should pass the status filter to findByProperty', () => {
    const query = { page: 1, limit: 10, status: WaitlistStatus.WAITING };
    controller.findByProperty(propertyId, query);
    expect(service.findByProperty).toHaveBeenCalledWith(
      propertyId,
      query,
      WaitlistStatus.WAITING,
    );
  });

  it('should delegate notifyAvailable', () => {
    const dto = { start_date: '2026-11-01', end_date: '2026-11-03' };
    controller.notifyAvailable(propertyId, dto);
    expect(service.notifyAvailable).toHaveBeenCalledWith(propertyId, dto);
  });

  it('should delegate getPosition and confirm', () => {
    controller.getPosition({ id });
    controller.confirm({ id });
    expect(service.getPosition).toHaveBeenCalledWith(id);
    expect(service.confirm).toHaveBeenCalledWith(id);
  });

  it('should delegate convert with the reservation id', () => {
    controller.convert({ id }, { reservation_id: propertyId });
    expect(service.convertToReservation).toHaveBeenCalledWith(id, propertyId);
  });

  it('should delegate cancel with the reason', () => {
    controller.cancel({ id }, { reason: 'x' });
    expect(service.cancel).toHaveBeenCalledWith(id, 'x');
  });
});
