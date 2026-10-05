import { Test, TestingModule } from '@nestjs/testing';
import { RoomTypeController } from './room-type.controller';
import { RoomTypeService } from '../services/room-type.service';

describe('RoomTypeController', () => {
  let controller: RoomTypeController;
  let service: RoomTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomTypeController],
      providers: [
        {
          provide: RoomTypeService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByProperty: jest.fn(),
            updateBasePrice: jest.fn(),
            getRooms: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RoomTypeController>(RoomTypeController);
    service = module.get<RoomTypeService>(RoomTypeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to the service', () => {
    const dto = {
      property_id: '507f1f77bcf86cd799439011',
      name: 'Deluxe',
      code: 'DLX',
      base_price: { amount: 100 },
    };
    controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});
