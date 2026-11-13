import { Test, TestingModule } from '@nestjs/testing';
import { PosItemController } from './pos-item.controller';
import { PosItemService } from '../services/pos-item.service';
import { PosCategory } from '../schemas/pos-item.entity';

describe('PosItemController', () => {
  let controller: PosItemController;
  let service: Record<string, jest.Mock>;
  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PosItemController],
      providers: [
        {
          provide: PosItemService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            restore: jest.fn(),
            getCatalog: jest.fn(),
            getInventory: jest.fn(),
            getLowStockItems: jest.fn(),
            adjustStock: jest.fn(),
            setStock: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PosItemController>(PosItemController);
    service = module.get(PosItemService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates CRUD calls', async () => {
    await controller.findOne({ id });
    await controller.update({ id }, { name: 'X' });
    await controller.remove({ id });
    expect(service.findOne).toHaveBeenCalledWith(id);
    expect(service.update).toHaveBeenCalledWith(id, { name: 'X' });
    expect(service.remove).toHaveBeenCalledWith(id);
  });

  it('delegates catalog / inventory / low-stock', async () => {
    await controller.getCatalog(propertyId, PosCategory.SPA);
    await controller.getInventory(propertyId);
    await controller.getLowStockItems(propertyId);
    expect(service.getCatalog).toHaveBeenCalledWith(
      propertyId,
      PosCategory.SPA,
    );
    expect(service.getInventory).toHaveBeenCalledWith(propertyId);
    expect(service.getLowStockItems).toHaveBeenCalledWith(propertyId);
  });

  it('delegates stock operations', async () => {
    await controller.adjustStock({ id }, { delta: -2 });
    await controller.setStock({ id }, { quantity: 8 });
    expect(service.adjustStock).toHaveBeenCalledWith(id, -2);
    expect(service.setStock).toHaveBeenCalledWith(id, 8);
  });

  it('delegates activate / deactivate', async () => {
    await controller.activate({ id });
    await controller.deactivate({ id });
    expect(service.activate).toHaveBeenCalledWith(id);
    expect(service.deactivate).toHaveBeenCalledWith(id);
  });
});
