/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { OtaConnectionService } from './ota-connection.service';
import {
  OtaConnection,
  OtaConnectionSchema,
  OtaConnectionStatus,
  OtaProvider,
  OtaSyncStatus,
} from '../schemas/ota-connection.entity';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});
const chainOf = (value: unknown) => ({
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});
const applyUpdate = (doc: any, update: any) => {
  const next = { ...doc };
  for (const [key, value] of Object.entries(update)) {
    if (key === '$unset') {
      for (const f of Object.keys(value as object)) delete next[f];
    } else {
      next[key] = value;
    }
  }
  return next;
};

describe('OtaConnectionService', () => {
  let service: OtaConnectionService;
  let model: any;
  let conn: any;
  const propertyId = new Types.ObjectId();
  const roomTypeId = new Types.ObjectId();

  beforeEach(async () => {
    conn = {
      _id: new Types.ObjectId(),
      property_id: propertyId,
      provider: OtaProvider.BOOKING,
      ota_property_id: 'HOTEL-123',
      credentials: { username: 'u', password: 'p' },
      room_mappings: [{ room_type_id: roomTypeId, ota_room_type_id: 'DBL' }],
      status: OtaConnectionStatus.PENDING,
      is_enabled: false,
      sync_status: OtaSyncStatus.NEVER,
      consecutive_failures: 0,
    };

    const ModelMock: any = function (data: any) {
      const doc = { ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockImplementation(() => execOf(conn));
    ModelMock.findOne = jest.fn().mockImplementation(() => chainOf(conn));
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockImplementation((_id, update) => execOf(applyUpdate(conn, update)));
    ModelMock.findOneAndUpdate = jest
      .fn()
      .mockImplementation((_f, update) => execOf(applyUpdate(conn, update)));
    ModelMock.find = jest.fn().mockReturnValue(chainOf([conn]));
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(1));
    ModelMock.exists = jest.fn().mockResolvedValue(null);
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtaConnectionService,
        { provide: getModelToken(OtaConnection.name), useValue: model },
      ],
    }).compile();

    service = module.get<OtaConnectionService>(OtaConnectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('declares credentials as select:false and strips them from JSON', () => {
    expect(OtaConnectionSchema.path('credentials').options.select).toBe(false);
    const transform = (OtaConnectionSchema.get('toJSON') as any).transform;
    expect(transform(null, { a: 1, credentials: { x: 'y' } })).toEqual({
      a: 1,
    });
  });

  describe('create', () => {
    const dto = {
      property_id: propertyId.toString(),
      provider: OtaProvider.EXPEDIA,
      ota_property_id: 'EXP-1',
    };

    it('creates a pending, disabled connection', async () => {
      const result = await service.create(dto);
      expect(result.status).toBe(OtaConnectionStatus.PENDING);
      expect(result.is_enabled).toBe(false);
      expect(result.sync_status).toBe(OtaSyncStatus.NEVER);
    });

    it('rejects a second connection for the same provider', async () => {
      model.exists.mockResolvedValue({ _id: conn._id });
      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects duplicated room mappings', async () => {
      const id = roomTypeId.toString();
      await expect(
        service.create({
          ...dto,
          room_mappings: [
            { room_type_id: id, ota_room_type_id: 'A' },
            { room_type_id: id, ota_room_type_id: 'B' },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('findByProperty lists connections of a property', async () => {
    const result = await service.findByProperty(propertyId.toString());
    expect(result).toEqual([conn]);
    expect(model.find.mock.calls[0][0].property_id).toEqual(propertyId);
  });

  it('getConnectionStatus summarizes the connection', async () => {
    const summary = await service.getConnectionStatus(
      propertyId.toString(),
      OtaProvider.BOOKING,
    );
    expect(summary).toMatchObject({
      provider: OtaProvider.BOOKING,
      status: OtaConnectionStatus.PENDING,
      mapped_room_types: 1,
    });
    expect(summary).not.toHaveProperty('credentials');
  });

  it('getConnectionStatus throws 404 when missing', async () => {
    model.findOne.mockReturnValue(chainOf(null));
    await expect(
      service.getConnectionStatus(propertyId.toString(), OtaProvider.AGODA),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('updateCredentials', () => {
    it('replaces credentials', async () => {
      const result = await service.updateCredentials(conn._id.toString(), {
        username: 'new',
        password: 'pwd',
      });
      expect(result.credentials).toEqual({ username: 'new', password: 'pwd' });
      expect(result.status).toBe(OtaConnectionStatus.PENDING);
    });

    it('resets an errored connection to pending', async () => {
      conn.status = OtaConnectionStatus.ERROR;
      conn.consecutive_failures = 5;
      const result = await service.updateCredentials(conn._id.toString(), {
        username: 'u',
      });
      expect(result.status).toBe(OtaConnectionStatus.PENDING);
      expect(result.consecutive_failures).toBe(0);
    });
  });

  describe('room mappings', () => {
    it('sets mappings', async () => {
      const other = new Types.ObjectId().toString();
      const result = await service.setRoomMappings(conn._id.toString(), [
        { room_type_id: other, ota_room_type_id: 'SGL' },
      ]);
      expect(result.room_mappings[0].room_type_id.toString()).toBe(other);
    });

    it('rejects duplicated OTA room types', async () => {
      await expect(
        service.setRoomMappings(conn._id.toString(), [
          {
            room_type_id: new Types.ObjectId().toString(),
            ota_room_type_id: 'X',
          },
          {
            room_type_id: new Types.ObjectId().toString(),
            ota_room_type_id: 'X',
          },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('removes a mapping', async () => {
      const result = await service.removeRoomMapping(
        conn._id.toString(),
        roomTypeId.toString(),
      );
      expect(result.room_mappings).toEqual([]);
    });

    it('throws 404 when removing an unknown mapping', async () => {
      await expect(
        service.removeRoomMapping(
          conn._id.toString(),
          new Types.ObjectId().toString(),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('enable / disable', () => {
    it('enables a fully configured connection', async () => {
      const result = await service.enable(conn._id.toString());
      expect(result.is_enabled).toBe(true);
      expect(result.status).toBe(OtaConnectionStatus.ACTIVE);
      const query = model.findOne.mock.results[0].value;
      expect(query.select).toHaveBeenCalledWith('+credentials');
    });

    it('refuses without required credentials', async () => {
      conn.credentials = { username: 'u' };
      await expect(service.enable(conn._id.toString())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('refuses without room mappings', async () => {
      conn.room_mappings = [];
      await expect(service.enable(conn._id.toString())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws 404 for an unknown connection', async () => {
      model.findOne.mockReturnValue(chainOf(null));
      await expect(service.enable(conn._id.toString())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('disables a connection', async () => {
      conn.is_enabled = true;
      const result = await service.disable(conn._id.toString());
      expect(result.is_enabled).toBe(false);
      expect(result.status).toBe(OtaConnectionStatus.DISABLED);
    });
  });

  describe('startSync', () => {
    it('locks the connection in progress', async () => {
      conn.is_enabled = true;
      const result = await service.startSync(conn._id.toString());
      expect(result.sync_status).toBe(OtaSyncStatus.IN_PROGRESS);
      expect(model.findOneAndUpdate.mock.calls[0][0].sync_status).toEqual({
        $ne: OtaSyncStatus.IN_PROGRESS,
      });
    });

    it('refuses a disabled connection', async () => {
      await expect(
        service.startSync(conn._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses when a sync is already running', async () => {
      conn.is_enabled = true;
      conn.sync_status = OtaSyncStatus.IN_PROGRESS;
      await expect(
        service.startSync(conn._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses when the lock is lost to a concurrent call', async () => {
      conn.is_enabled = true;
      model.findOneAndUpdate.mockReturnValue(execOf(null));
      await expect(
        service.startSync(conn._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('recordSync', () => {
    beforeEach(() => {
      conn.is_enabled = true;
      conn.status = OtaConnectionStatus.ACTIVE;
      conn.sync_status = OtaSyncStatus.IN_PROGRESS;
    });

    it('records a successful sync', async () => {
      conn.last_sync_error = 'old';
      conn.consecutive_failures = 2;
      const result = await service.recordSync(conn._id.toString(), {
        success: true,
        stats: { reservations_imported: 3 },
      });
      expect(result.sync_status).toBe(OtaSyncStatus.SUCCESS);
      expect(result.consecutive_failures).toBe(0);
      expect(result.last_successful_sync_at).toBeInstanceOf(Date);
      expect(result.last_sync_stats?.reservations_imported).toBe(3);
      expect(result.last_sync_error).toBeUndefined();
    });

    it('records a partial sync when errors are reported', async () => {
      const result = await service.recordSync(conn._id.toString(), {
        success: true,
        stats: { error_count: 2 },
      });
      expect(result.sync_status).toBe(OtaSyncStatus.PARTIAL);
    });

    it('recovers an errored connection on success', async () => {
      conn.status = OtaConnectionStatus.ERROR;
      const result = await service.recordSync(conn._id.toString(), {
        success: true,
      });
      expect(result.status).toBe(OtaConnectionStatus.ACTIVE);
    });

    it('records a failure and increments the counter', async () => {
      const result = await service.recordSync(conn._id.toString(), {
        success: false,
        error: 'Timeout',
      });
      expect(result.sync_status).toBe(OtaSyncStatus.FAILED);
      expect(result.consecutive_failures).toBe(1);
      expect(result.last_sync_error).toBe('Timeout');
      expect(result.status).toBe(OtaConnectionStatus.ACTIVE);
    });

    it('switches to error after too many failures', async () => {
      conn.consecutive_failures = 4;
      const result = await service.recordSync(conn._id.toString(), {
        success: false,
      });
      expect(result.status).toBe(OtaConnectionStatus.ERROR);
      expect(result.consecutive_failures).toBe(5);
    });

    it('refuses when no sync is running', async () => {
      conn.sync_status = OtaSyncStatus.SUCCESS;
      await expect(
        service.recordSync(conn._id.toString(), { success: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('testConnection', () => {
    it('reports a valid configuration without HTTP call', async () => {
      const result = await service.testConnection(conn._id.toString());
      expect(result.ok).toBe(true);
      expect(result.missing_credentials).toEqual([]);
      expect(model.findByIdAndUpdate.mock.calls[0][1]).toHaveProperty(
        'last_tested_at',
      );
    });

    it('reports missing credentials', async () => {
      conn.provider = OtaProvider.AIRBNB;
      const result = await service.testConnection(conn._id.toString());
      expect(result.ok).toBe(false);
      expect(result.missing_credentials).toEqual(['api_key']);
    });

    it('throws 404 for an unknown connection', async () => {
      model.findOne.mockReturnValue(chainOf(null));
      await expect(
        service.testConnection(conn._id.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('findDueForSync selects stale active connections', async () => {
    await service.findDueForSync(30);
    const filter = model.find.mock.calls[0][0];
    expect(filter.is_enabled).toBe(true);
    expect(filter.status).toBe(OtaConnectionStatus.ACTIVE);
    expect(filter.$or).toHaveLength(3);
  });
});
