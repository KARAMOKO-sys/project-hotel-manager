import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from '../services/organization.service';

describe('OrganizationController', () => {
  let controller: OrganizationController;
  let service: OrganizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        {
          provide: OrganizationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getSettings: jest.fn(),
            updateSettings: jest.fn(),
            getMembers: jest.fn(),
            addMember: jest.fn(),
            removeMember: jest.fn(),
            getStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrganizationController>(OrganizationController);
    service = module.get<OrganizationService>(OrganizationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to the service', () => {
    const dto = { name: 'Chain', code: 'CH' };
    controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should delegate findAll to the service', () => {
    const query = { page: 1, limit: 10 };
    controller.findAll(query as any);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });
});
