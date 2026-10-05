import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { GuestPreferenceService } from './guest-preference.service';
import { GuestPreference } from '../schemas/guest-preference.entity';

describe('GuestPreferenceService', () => {
  let service: GuestPreferenceService;
  let model: any;

  const preference = {
    _id: new Types.ObjectId(),
    guest_id: new Types.ObjectId(),
    preference_type: 'room',
    value: 'quiet',
  };

  beforeEach(async () => {
    model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(preference) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(preference) }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([preference]),
      }),
      findOneAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(preference) }),
      findOneAndDelete: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(preference) }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestPreferenceService,
        { provide: getModelToken(GuestPreference.name), useValue: model },
      ],
    }).compile();

    service = module.get<GuestPreferenceService>(GuestPreferenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list preferences by guest', async () => {
    const result = await service.findByGuest(preference.guest_id.toString());
    expect(result).toEqual([preference]);
  });

  it('should upsert a preference', async () => {
    const result = await service.updatePreference(
      preference.guest_id.toString(),
      'room',
      'high_floor',
    );
    expect(result).toEqual(preference);
    expect(model.findOneAndUpdate).toHaveBeenCalled();
  });

  it('should delete a preference', async () => {
    await service.deletePreference(preference.guest_id.toString(), 'room');
    expect(model.findOneAndDelete).toHaveBeenCalled();
  });
});
