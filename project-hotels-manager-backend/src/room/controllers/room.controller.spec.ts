import { Test, TestingModule } from '@nestjs/testing';
import { RoomController } from './room.controller';
import { RoomService } from '../services/room.service';

describe('RoomController', () => {
  let controller: RoomController;
  let service: RoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByProperty: jest.fn(),
            getAvailableRooms: jest.fn(),
            getMaintenanceRooms: jest.fn(),
            updateStatus: jest.fn(),
            blockRoom: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RoomController>(RoomController);
    service = module.get<RoomService>(RoomService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate updateStatus to the service', () => {
    controller.updateStatus(
      { id: '507f1f77bcf86cd799439011' } as any,
      {
        status: 'clean',
      } as any,
    );
    expect(service.updateStatus).toHaveBeenCalled();
  });
});
