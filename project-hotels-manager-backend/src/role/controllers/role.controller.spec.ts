import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { RoleService } from '../services/role.service';

describe('RoleController', () => {
  let controller: RoleController;
  let service: RoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findActive: jest.fn(),
            search: jest.fn(),
            findByLevel: jest.fn(),
            findByCode: jest.fn(),
            getPermissions: jest.fn(),
            addPermission: jest.fn(),
            removePermission: jest.fn(),
            checkPermissions: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to the service', () => {
    const dto = { name: 'Manager', code: 'manager' };
    controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});
