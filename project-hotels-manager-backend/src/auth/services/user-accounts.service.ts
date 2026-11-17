import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types, UpdateQuery } from 'mongoose';
import { User } from '../../base-entities/user.abstract';
import { UserType } from '../../base-entities/enums/user-type.enum';
import { Guest } from '../../guest/schemas/guest.entity';
import { Owner } from '../../owners/schemas/owner.entity';
import { SuperAdmin } from '../../admins/schemas/admin.entity';
import { Receptionist } from '../../receptionist/schemas/receptionist.entity';
import { HousekeepingStaff } from '../../housekeeping-staff/schemas/housekeeping-staff.entity';
import { Accountant } from '../../accountant/schemas/accountant.entity';

/** Document utilisateur, quel que soit son type. */
export type AuthUserDocument = HydratedDocument<User> & Record<string, any>;

/** Compte utilisateur trouvé, avec le type (collection) d'origine. */
export interface UserAccount {
  type: UserType;
  user: AuthUserDocument;
}

/** Profil public renvoyé au client (sans données sensibles). */
export interface UserProfile {
  id: string;
  email: string;
  user_type: UserType;
  phone?: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  pseudo?: string;
  avatar_url?: string;
  language?: string;
  timezone?: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  two_factor_enabled: boolean;
  last_login_at?: Date;
  created_at?: Date;
}

/** Champs sensibles à sélectionner explicitement (`select: false`). */
const SECRET_FIELDS = '+password_hash +two_factor_secret';

/**
 * Ordre de priorité des types de comptes lorsqu'un même email existe dans
 * plusieurs collections.
 */
export const USER_TYPE_PRIORITY: UserType[] = [
  UserType.SUPER_ADMIN,
  UserType.OWNER,
  UserType.ACCOUNTANT,
  UserType.RECEPTIONIST,
  UserType.HOUSEKEEPING,
  UserType.GUEST,
];

/**
 * Accès unifié aux comptes utilisateurs répartis dans plusieurs collections
 * (guests, owners, super_admins, receptionists, housekeeping_staff,
 * accountants). Les partenaires ne sont pas encore pris en charge.
 */
@Injectable()
export class UserAccountsService {
  private readonly models: Map<UserType, Model<User>>;

  constructor(
    @InjectModel(Guest.name) guestModel: Model<Guest>,
    @InjectModel(Owner.name) ownerModel: Model<Owner>,
    @InjectModel(SuperAdmin.name) superAdminModel: Model<SuperAdmin>,
    @InjectModel(Receptionist.name) receptionistModel: Model<Receptionist>,
    @InjectModel(HousekeepingStaff.name)
    housekeepingModel: Model<HousekeepingStaff>,
    @InjectModel(Accountant.name) accountantModel: Model<Accountant>,
  ) {
    const asUserModel = (model: unknown) => model as Model<User>;
    this.models = new Map<UserType, Model<User>>([
      [UserType.SUPER_ADMIN, asUserModel(superAdminModel)],
      [UserType.OWNER, asUserModel(ownerModel)],
      [UserType.ACCOUNTANT, asUserModel(accountantModel)],
      [UserType.RECEPTIONIST, asUserModel(receptionistModel)],
      [UserType.HOUSEKEEPING, asUserModel(housekeepingModel)],
      [UserType.GUEST, asUserModel(guestModel)],
    ]);
  }

  /** Types de comptes pris en charge, par ordre de priorité. */
  get supportedTypes(): UserType[] {
    return USER_TYPE_PRIORITY.filter((type) => this.models.has(type));
  }

  /** Modèle Mongoose associé à un type d'utilisateur. */
  getModel(type: UserType): Model<User> | undefined {
    return this.models.get(type);
  }

  /**
   * Recherche les comptes (non supprimés) associés à un email, triés par
   * priorité. `userType` limite la recherche à une collection.
   */
  async findByEmail(
    email: string,
    options: { withSecrets?: boolean; userType?: UserType } = {},
  ): Promise<UserAccount[]> {
    const normalized = UserAccountsService.normalizeEmail(email);
    if (!normalized) {
      return [];
    }
    const types = options.userType
      ? this.supportedTypes.filter((t) => t === options.userType)
      : this.supportedTypes;

    const results = await Promise.all(
      types.map(async (type) => {
        const query = this.models
          .get(type)!
          .findOne({ email: normalized, is_deleted: { $ne: true } });
        const user = (await (options.withSecrets
          ? query.select(SECRET_FIELDS)
          : query
        ).exec()) as AuthUserDocument | null;
        return user ? { type, user } : null;
      }),
    );
    return results.filter((r): r is UserAccount => r !== null);
  }

  /** Indique si l'email est déjà utilisé dans l'une des collections. */
  async emailExists(email: string): Promise<boolean> {
    const normalized = UserAccountsService.normalizeEmail(email);
    const results = await Promise.all(
      this.supportedTypes.map((type) =>
        this.models.get(type)!.exists({ email: normalized }).exec(),
      ),
    );
    return results.some((r) => !!r);
  }

  /** Charge un compte par identifiant (non supprimé). */
  async findById(
    type: UserType,
    id: string,
    withSecrets = false,
  ): Promise<AuthUserDocument | null> {
    const model = this.models.get(type);
    if (!model || !Types.ObjectId.isValid(id)) {
      return null;
    }
    const query = model.findOne({ _id: id, is_deleted: { $ne: true } });
    return (await (withSecrets
      ? query.select(SECRET_FIELDS)
      : query
    ).exec()) as AuthUserDocument | null;
  }

  /** Met à jour un compte. */
  async updateById(
    type: UserType,
    id: string,
    update: UpdateQuery<User>,
  ): Promise<void> {
    const model = this.models.get(type);
    if (!model) {
      return;
    }
    await model.updateOne({ _id: id }, update).exec();
  }

  /** Construit le profil public d'un utilisateur. */
  static toProfile(user: AuthUserDocument, type: UserType): UserProfile {
    const first = user.first_name;
    const last = user.last_name;
    const metadata = (user.metadata ?? {}) as Record<string, unknown>;
    return {
      id: String(user._id),
      email: user.email,
      user_type: type,
      phone: user.phone,
      first_name: first,
      last_name: last,
      full_name: `${first ?? ''} ${last ?? ''}`.trim(),
      pseudo: typeof metadata.pseudo === 'string' ? metadata.pseudo : undefined,
      avatar_url: user.avatar_url,
      language: user.language,
      timezone: user.timezone,
      is_active: user.is_active !== false,
      is_email_verified: !!user.is_email_verified,
      is_phone_verified: !!user.is_phone_verified,
      two_factor_enabled: !!user.two_factor_enabled,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    };
  }

  static normalizeEmail(email: string): string {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
  }
}
