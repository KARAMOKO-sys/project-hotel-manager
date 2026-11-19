/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InventoryService } from './inventory.service';
import { StockLocationType } from '../inventory.enums';

const q = (value: unknown) => {
  const query: any = {
    lean: jest.fn(() => query),
    exec: jest.fn().mockResolvedValue(value),
  };
  return query;
};

describe('InventoryService', () => {
  const propertyId = String(new Types.ObjectId());
  const reservationId = String(new Types.ObjectId());
  const eco = { _id: new Types.ObjectId(), code: 'ECO' };
  const conso = { _id: new Types.ObjectId(), code: 'CONSO' };
  const vendorLoc = { _id: new Types.ObjectId() };
  const stockLoc = { _id: new Types.ObjectId() };
  let productModel: any;
  let locations: any;
  let moves: any;
  let service: InventoryService;

  beforeEach(() => {
    productModel = { find: jest.fn(), findOne: jest.fn() };
    locations = {
      getByCode: jest.fn().mockResolvedValue(eco),
      getDefault: jest.fn((_p: string, type: StockLocationType) =>
        Promise.resolve(
          type === StockLocationType.CONSUMPTION
            ? conso
            : type === StockLocationType.VENDOR
              ? vendorLoc
              : stockLoc,
        ),
      ),
    };
    moves = {
      create: jest.fn((input: any) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          reference: 'MV/2026/00009',
          ...input,
        }),
      ),
      validate: jest.fn().mockResolvedValue({}),
      createAndValidate: jest.fn().mockResolvedValue({ _id: 'm1' }),
    };
    service = new InventoryService(
      productModel,
      {} as any,
      {} as any,
      locations,
      moves,
    );
  });

  it('receive : mouvement validé fournisseurs → stock principal', async () => {
    const productId = String(new Types.ObjectId());
    await service.receive(productId, 12, 650, propertyId, {
      model: 'PurchaseOrder',
      id: 'po1',
    });
    expect(moves.createAndValidate).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: productId,
        quantity: 12,
        unit_cost: 650,
        source_location_id: String(vendorLoc._id),
        dest_location_id: String(stockLoc._id),
        origin: { model: 'PurchaseOrder', id: 'po1' },
      }),
      undefined,
    );
  });

  describe('consumeForCheckout', () => {
    const kit = {
      _id: new Types.ObjectId(),
      name: 'Kit accueil',
      consumed_per_checkout: 2,
    };
    const soap = {
      _id: new Types.ObjectId(),
      name: 'Savon',
      consumed_per_checkout: 1,
    };

    beforeEach(() => {
      productModel.find.mockReturnValue(q([kit, soap]));
    });

    it('sort de l’économat vers la consommation, par chambre, avec clé d’idempotence', async () => {
      const result = await service.consumeForCheckout(
        propertyId,
        reservationId,
        2,
      );
      expect(result).toEqual({ created: 2, skipped: 0, failed: 0 });
      expect(moves.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 4,
          source_location_id: String(eco._id),
          dest_location_id: String(conso._id),
          origin: { model: 'Reservation', id: reservationId },
          idempotency_key: `checkout:${reservationId}:${String(kit._id)}`,
        }),
        undefined,
      );
    });

    it('ignore les consommations déjà enregistrées (événement rejoué)', async () => {
      moves.create.mockRejectedValue(new ConflictException('déjà'));
      const result = await service.consumeForCheckout(
        propertyId,
        reservationId,
        1,
      );
      expect(result).toEqual({ created: 0, skipped: 2, failed: 0 });
      expect(moves.validate).not.toHaveBeenCalled();
    });

    it('stock insuffisant : journalisé, sans lever d’erreur', async () => {
      moves.validate
        .mockRejectedValueOnce(new BadRequestException('Stock insuffisant'))
        .mockResolvedValueOnce({});
      const result = await service.consumeForCheckout(
        propertyId,
        reservationId,
        1,
      );
      expect(result).toEqual({ created: 1, skipped: 0, failed: 1 });
    });
  });
});
