import { Test, TestingModule } from '@nestjs/testing';
import { OtaConnectionController } from './ota-connection.controller';
import { OtaConnectionService } from '../services/ota-connection.service';
import { OtaProvider } from '../schemas/ota-connection.entity';

describe('OtaConnectionController', () => {
  let controller: OtaConnectionController;
  let service: Record<string, jest.Mock>;
  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OtaConnectionController],
      providers: [
        {
          provide: OtaConnectionService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByProperty: jest.fn(),
            findByPropertyAndProvider: jest.fn(),
            getConnectionStatus: jest.fn(),
            findDueForSync: jest.fn(),
            updateCredentials: jest.fn(),
            setRoomMappings: jest.fn(),
            removeRoomMapping: jest.fn(),
            enable: jest.fn(),
            disable: jest.fn(),
            testConnection: jest.fn(),
            startSync: jest.fn(),
            recordSync: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OtaConnectionController>(OtaConnectionController);
    service = module.get(OtaConnectionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates lifecycle actions', async () => {
    await controller.enable({ id });
    await controller.disable({ id });
    await controller.testConnection({ id });
    await controller.startSync({ id });
    await controller.recordSync({ id }, { success: true });
    expect(service.enable).toHaveBeenCalledWith(id);
    expect(service.disable).toHaveBeenCalledWith(id);
    expect(service.testConnection).toHaveBeenCalledWith(id);
    expect(service.startSync).toHaveBeenCalledWith(id);
    expect(service.recordSync).toHaveBeenCalledWith(id, { success: true });
  });

  it('delegates configuration changes', async () => {
    await controller.updateCredentials(
      { id },
      { credentials: { api_key: 'k' } },
    );
    await controller.setRoomMappings(
      { id },
      { room_mappings: [{ room_type_id: propertyId, ota_room_type_id: 'X' }] },
    );
    await controller.removeRoomMapping({ id }, propertyId);
    expect(service.updateCredentials).toHaveBeenCalledWith(id, {
      api_key: 'k',
    });
    expect(service.setRoomMappings).toHaveBeenCalledWith(id, [
      { room_type_id: propertyId, ota_room_type_id: 'X' },
    ]);
    expect(service.removeRoomMapping).toHaveBeenCalledWith(id, propertyId);
  });

  it('delegates property lookups', async () => {
    await controller.findByProperty(propertyId);
    await controller.findByPropertyAndProvider(propertyId, OtaProvider.AGODA);
    await controller.getConnectionStatus(propertyId, OtaProvider.BOOKING);
    await controller.findDueForSync(30);
    expect(service.findByProperty).toHaveBeenCalledWith(propertyId);
    expect(service.findByPropertyAndProvider).toHaveBeenCalledWith(
      propertyId,
      OtaProvider.AGODA,
    );
    expect(service.getConnectionStatus).toHaveBeenCalledWith(
      propertyId,
      OtaProvider.BOOKING,
    );
    expect(service.findDueForSync).toHaveBeenCalledWith(30);
  });
});
