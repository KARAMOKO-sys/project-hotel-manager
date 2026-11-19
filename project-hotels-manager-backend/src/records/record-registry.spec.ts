/* eslint-disable @typescript-eslint/no-unsafe-argument -- mocks typés `any` */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  findRecordModel,
  isRecordModel,
  RECORD_REGISTRY,
} from './record-registry';
import { RecordsService } from './services/records.service';

describe('record-registry', () => {
  it('résout un modèle par nom, casse, alias ou collection', () => {
    expect(findRecordModel('Reservation')?.collection).toBe('reservations');
    expect(findRecordModel('reservation')?.model).toBe('Reservation');
    expect(findRecordModel('HousekeepingTask')?.model).toBe('Housekeeping');
    expect(findRecordModel('crm_leads')?.model).toBe('Lead');
  });

  it('refuse les modèles inconnus ou invalides', () => {
    expect(findRecordModel('User')).toBeUndefined();
    expect(findRecordModel('')).toBeUndefined();
    expect(findRecordModel(undefined)).toBeUndefined();
    expect(isRecordModel('__proto__')).toBe(false);
  });

  it('a des noms de modèles et de collections uniques', () => {
    const models = RECORD_REGISTRY.map((d) => d.model);
    const collections = RECORD_REGISTRY.map((d) => d.collection);
    expect(new Set(models).size).toBe(models.length);
    expect(new Set(collections).size).toBe(collections.length);
  });
});

describe('RecordsService', () => {
  let findOne: jest.Mock;
  let service: RecordsService;
  const apps: any = { isInstalled: jest.fn().mockResolvedValue(true) };
  const tenant: any = {
    getOrganizationIdForProperty: jest.fn().mockResolvedValue(null),
  };

  beforeEach(() => {
    findOne = jest.fn();
    const connection: any = {
      collection: jest.fn().mockReturnValue({ findOne }),
      models: {},
    };
    service = new RecordsService(connection, apps, tenant);
  });

  it('valide le modèle et l’identifiant', async () => {
    await expect(
      service.assertRecordExists('Unknown', new Types.ObjectId().toString()),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.assertRecordExists('Reservation', 'pas-un-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('lève 404 si la fiche est absente', async () => {
    findOne.mockResolvedValue(null);
    await expect(
      service.assertRecordExists('Invoice', new Types.ObjectId().toString()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("retourne l'établissement de la fiche", async () => {
    const propertyId = new Types.ObjectId();
    findOne.mockResolvedValue({
      _id: new Types.ObjectId(),
      property_id: propertyId,
    });
    await expect(
      service.getRecordPropertyId(
        'reservations',
        new Types.ObjectId().toString(),
      ),
    ).resolves.toBe(String(propertyId));
  });
});
