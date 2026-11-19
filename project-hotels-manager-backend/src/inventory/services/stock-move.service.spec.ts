/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { StockMoveService } from './stock-move.service';
import {
  ProductType,
  StockLocationType,
  StockMoveState,
} from '../inventory.enums';
import { DomainEvents } from '../../platform/events/domain-events';

/** Requête Mongoose simulée (chaînable). */
const q = (value: unknown) => {
  const query: any = {
    lean: jest.fn(() => query),
    sort: jest.fn(() => query),
    select: jest.fn(() => query),
    exec: jest.fn().mockResolvedValue(value),
  };
  return query;
};

describe('StockMoveService', () => {
  const propertyId = new Types.ObjectId();
  const productId = new Types.ObjectId();
  const stock = {
    _id: new Types.ObjectId(),
    property_id: propertyId,
    name: 'Stock principal',
    location_type: StockLocationType.INTERNAL,
  };
  const vendor = {
    _id: new Types.ObjectId(),
    property_id: propertyId,
    name: 'Fournisseurs',
    location_type: StockLocationType.VENDOR,
  };
  const consumption = {
    _id: new Types.ObjectId(),
    property_id: propertyId,
    name: 'Consommation interne',
    location_type: StockLocationType.CONSUMPTION,
  };

  let product: any;
  let move: any;
  let moveModel: any;
  let quantModel: any;
  let productModel: any;
  let locationModel: any;
  let events: any;
  let service: StockMoveService;
  let totalQty: number;

  const build = (source: any, dest: any, quantity = 3, unitCost = 500) => {
    move = {
      _id: new Types.ObjectId(),
      property_id: propertyId,
      product_id: productId,
      source_location_id: source._id,
      dest_location_id: dest._id,
      quantity,
      unit_cost: unitCost,
      reference: 'MV/2026/00001',
      state: StockMoveState.DRAFT,
    };
    moveModel.findById.mockReturnValue(q(move));
    locationModel.findOne.mockImplementation((filter: any) =>
      q([stock, vendor, consumption].find((l) => l._id.equals(filter._id))),
    );
  };

  beforeEach(() => {
    product = {
      _id: productId,
      property_id: propertyId,
      name: 'Kit savon',
      product_type: ProductType.STOCKABLE,
      cost_price: 400,
      reorder_min: 5,
      reorder_max: 20,
      preferred_vendor_id: new Types.ObjectId(),
      currency: 'XOF',
    };
    totalQty = 0;
    moveModel = {
      findById: jest.fn(),
      findOneAndUpdate: jest.fn((_f: any, update: any) =>
        q({ ...move, ...update.$set }),
      ),
      updateOne: jest.fn(() => q({})),
    };
    quantModel = {
      findOneAndUpdate: jest.fn(() => q({ quantity: 10 })),
      updateOne: jest.fn(() => q({})),
      findOne: jest.fn(() => q({ quantity: 1 })),
      aggregate: jest.fn(() => q([{ total: totalQty }])),
    };
    productModel = {
      findOne: jest.fn(() => q(product)),
      updateOne: jest.fn(() => q({})),
    };
    locationModel = { findOne: jest.fn() };
    events = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new StockMoveService(
      moveModel,
      quantModel,
      productModel,
      locationModel,
      { next: jest.fn().mockResolvedValue('MV/2026/00001') } as any,
      events,
    );
  });

  it('refuse un stock négatif et remet le mouvement en brouillon', async () => {
    build(stock, consumption, 3);
    quantModel.findOneAndUpdate.mockReturnValue(q(null));

    await expect(service.validate(String(move._id))).rejects.toThrow(
      BadRequestException,
    );
    expect(quantModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        product_id: productId,
        location_id: stock._id,
        quantity: { $gte: 3 },
      },
      { $inc: { quantity: -3 } },
      { new: true },
    );
    expect(moveModel.updateOne).toHaveBeenCalledWith(
      { _id: move._id, state: StockMoveState.DONE },
      expect.objectContaining({ $set: { state: StockMoveState.DRAFT } }),
    );
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('ne valide jamais deux fois (réservation atomique de l’état)', async () => {
    build(stock, consumption);
    moveModel.findOneAndUpdate.mockReturnValue(q(null));
    await expect(service.validate(String(move._id))).rejects.toThrow(
      ConflictException,
    );
    expect(quantModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuse de valider un mouvement déjà validé', async () => {
    build(stock, consumption);
    move.state = StockMoveState.DONE;
    await expect(service.validate(String(move._id))).rejects.toThrow(
      ConflictException,
    );
  });

  it('réception fournisseur : incrémente le stock et recalcule le coût moyen', async () => {
    build(vendor, stock, 30, 500);
    totalQty = 40; // 10 existants + 30 reçus

    const done = await service.validate(String(move._id), 'user-1');

    expect(done.state).toBe(StockMoveState.DONE);
    expect(quantModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(quantModel.updateOne).toHaveBeenCalledWith(
      { product_id: productId, location_id: stock._id },
      { $inc: { quantity: 30 }, $setOnInsert: { property_id: propertyId } },
      { upsert: true },
    );
    expect(productModel.updateOne).toHaveBeenCalledWith(
      { _id: productId },
      { $set: { cost_price: 475 } },
    );
    expect(events.publish).toHaveBeenCalledWith(
      DomainEvents.STOCK_MOVE_DONE,
      expect.objectContaining({ actor_id: 'user-1' }),
    );
  });

  it('publie STOCK_LOW au franchissement du seuil minimum', async () => {
    build(stock, consumption, 3);
    totalQty = 4; // 7 → 4 avec un minimum de 5

    await service.validate(String(move._id));

    expect(events.publish).toHaveBeenCalledWith(DomainEvents.STOCK_LOW, {
      property_id: String(propertyId),
      actor_id: undefined,
      record: { model: 'Product', id: String(productId) },
      payload: {
        product_id: String(productId),
        product_name: 'Kit savon',
        property_id: String(propertyId),
        quantity_available: 4,
        reorder_min: 5,
        reorder_max: 20,
        preferred_vendor_id: String(product.preferred_vendor_id),
      },
    });
  });

  it('ne republie pas STOCK_LOW lorsque le stock était déjà sous le seuil', async () => {
    build(stock, consumption, 1);
    totalQty = 3; // 4 → 3 : déjà sous le seuil
    await service.validate(String(move._id));
    const names = events.publish.mock.calls.map((c: any[]) => c[0]);
    expect(names).toEqual([DomainEvents.STOCK_MOVE_DONE]);
  });

  it('refuse un mouvement d’un service ou entre emplacements identiques', async () => {
    build(stock, consumption);
    await expect(
      service.create({
        property_id: String(propertyId),
        product_id: String(productId),
        quantity: 1,
        source_location_id: String(stock._id),
        dest_location_id: String(stock._id),
      }),
    ).rejects.toThrow(BadRequestException);

    product.product_type = ProductType.SERVICE;
    await expect(
      service.create({
        property_id: String(propertyId),
        product_id: String(productId),
        quantity: 1,
        source_location_id: String(stock._id),
        dest_location_id: String(consumption._id),
      }),
    ).rejects.toThrow(/service/);
  });
});
