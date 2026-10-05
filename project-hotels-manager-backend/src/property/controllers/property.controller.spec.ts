import { Test, TestingModule } from '@nestjs/testing';
import { PropertyController } from './property.controller';
import { PropertyService } from '../services/property.service';

describe('PropertyController', () => {
  let controller: PropertyController;
  let service: PropertyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertyController],
      providers: [
        {
          provide: PropertyService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByOrganization: jest.fn(),
            findByOwner: jest.fn(),
            getSettings: jest.fn(),
            updateSettings: jest.fn(),
            getRooms: jest.fn(),
            getRoomTypes: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PropertyController>(PropertyController);
    service = module.get<PropertyService>(PropertyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to the service', () => {
    const dto = {
      organization_id: '507f1f77bcf86cd799439011',
      name: 'H',
      code: 'H',
    };
    controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});
