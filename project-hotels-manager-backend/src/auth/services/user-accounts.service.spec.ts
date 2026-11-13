/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UserAccountsService } from './user-accounts.service';
import { UserType } from '../../base-entities/enums/user-type.enum';
import { Guest } from '../../guest/schemas/guest.entity';
import { Owner } from '../../owners/schemas/owner.entity';
import { SuperAdmin } from '../../admins/schemas/admin.entity';
import { Receptionist } from '../../receptionist/schemas/receptionist.entity';
import { HousekeepingStaff } from '../../housekeeping-staff/schemas/housekeeping-staff.entity';
import { Accountant } from '../../accountant/schemas/accountant.entity';

const exec = (value: any) => ({ exec: jest.fn().mockResolvedValue(value) });

function model(found: any = null) {
  const select = jest.fn(() => exec(found));
  return {
    select,
    findOne: jest.fn(() => ({
      select,
      exec: jest.fn().mockResolvedValue(found),
    })),
    exists: jest.fn(() => exec(found ? { _id: found._id } : null)),
    updateOne: jest.fn(() => exec({})),
  };
}

describe('UserAccountsService', () => {
  let service: UserAccountsService;
  let models: Record<string, ReturnType<typeof model>>;
  const guest = { _id: new Types.ObjectId(), email: 'a@b.c' };
  const owner = { _id: new Types.ObjectId(), email: 'a@b.c' };

  beforeEach(async () => {
    models = {
      [Guest.name]: model(guest),
      [Owner.name]: model(owner),
      [SuperAdmin.name]: model(),
      [Receptionist.name]: model(),
      [HousekeepingStaff.name]: model(),
      [Accountant.name]: model(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAccountsService,
        ...Object.entries(models).map(([name, value]) => ({
          provide: getModelToken(name),
          useValue: value,
        })),
      ],
    }).compile();
    service = module.get(UserAccountsService);
  });

  it('searches every collection, sorted by priority, with normalized email', async () => {
    const result = await service.findByEmail('  A@B.C ', { withSecrets: true });
    expect(result.map((r) => r.type)).toEqual([UserType.OWNER, UserType.GUEST]);
    expect(models[Guest.name].findOne).toHaveBeenCalledWith({
      email: 'a@b.c',
      is_deleted: { $ne: true },
    });
    expect(models[Guest.name].select).toHaveBeenCalledWith(
      '+password_hash +two_factor_secret',
    );
  });

  it('restricts the search to one user type', async () => {
    const result = await service.findByEmail('a@b.c', {
      userType: UserType.GUEST,
    });
    expect(result).toHaveLength(1);
    expect(models[Owner.name].findOne).not.toHaveBeenCalled();
    expect(models[Guest.name].select).not.toHaveBeenCalled();
  });

  it('checks email existence across collections', async () => {
    await expect(service.emailExists('a@b.c')).resolves.toBe(true);
    models[Guest.name].exists.mockReturnValue(exec(null));
    models[Owner.name].exists.mockReturnValue(exec(null));
    await expect(service.emailExists('a@b.c')).resolves.toBe(false);
  });

  it('findById ignores invalid ids and unknown types', async () => {
    await expect(service.findById(UserType.GUEST, 'nope')).resolves.toBeNull();
    await expect(
      service.findById(UserType.PARTNER, guest._id.toString()),
    ).resolves.toBeNull();
    await expect(
      service.findById(UserType.GUEST, guest._id.toString()),
    ).resolves.toBe(guest);
  });

  it('builds a profile without secrets', () => {
    const profile = UserAccountsService.toProfile(
      {
        _id: guest._id,
        email: 'a@b.c',
        first_name: 'Awa',
        last_name: 'Koné',
        password_hash: 'hash',
        two_factor_secret: 'secret',
        metadata: { pseudo: 'awak' },
      } as any,
      UserType.GUEST,
    );
    expect(profile).toMatchObject({
      id: guest._id.toString(),
      full_name: 'Awa Koné',
      pseudo: 'awak',
      user_type: UserType.GUEST,
      is_active: true,
    });
    expect(profile).not.toHaveProperty('password_hash');
    expect(profile).not.toHaveProperty('two_factor_secret');
  });
});
