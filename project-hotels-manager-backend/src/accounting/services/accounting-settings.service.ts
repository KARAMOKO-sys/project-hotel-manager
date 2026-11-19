import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account } from '../schemas/account.entity';
import { Journal } from '../schemas/journal.entity';
import { AccountingSettings } from '../schemas/accounting-settings.entity';
import { UpdateAccountingSettingsDto } from '../dto/accounting-settings.dto';
import {
  ACCOUNT_ROLES,
  AccountRole,
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNT_MAPPING,
  DEFAULT_JOURNALS,
  DEFAULT_JOURNAL_MAPPING,
  JOURNAL_ROLES,
  JournalRole,
} from '../domain/syscohada-chart';
import { syscohadaClassOf, toAccountingDate } from '../domain/accounting.logic';
import { Currency } from '../../base-entities/enums/currency.enum';
import { isDuplicateKeyError, toObjectId } from './accounting.utils';

export interface SetupResult {
  accounts_created: number;
  journals_created: number;
  settings_created: boolean;
}

/**
 * Paramètres comptables par établissement et initialisation (idempotente)
 * du plan comptable SYSCOHADA, des journaux et des paramètres par défaut.
 */
@Injectable()
export class AccountingSettingsService {
  constructor(
    @InjectModel(AccountingSettings.name)
    private readonly settingsModel: Model<AccountingSettings>,
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    @InjectModel(Journal.name) private readonly journalModel: Model<Journal>,
  ) {}

  /** Paramètres de l'établissement, ou `null` si la comptabilité n'est pas initialisée. */
  async findForProperty(
    propertyId: string,
  ): Promise<AccountingSettings | null> {
    if (!Types.ObjectId.isValid(propertyId)) return null;
    return await this.settingsModel
      .findOne({ property_id: new Types.ObjectId(propertyId) })
      .lean()
      .exec();
  }

  async get(propertyId: string): Promise<AccountingSettings> {
    toObjectId(propertyId, 'property_id');
    const settings = await this.findForProperty(propertyId);
    if (!settings) {
      throw new NotFoundException(
        'Comptabilité non initialisée pour cet établissement (POST accounting/setup)',
      );
    }
    return settings;
  }

  /** Correspondance rôle → code de compte (valeurs par défaut complétées). */
  static accountMapping(
    settings?: Pick<AccountingSettings, 'accounts'> | null,
  ): Record<AccountRole, string> {
    const stored = (settings?.accounts ?? {}) as Partial<
      Record<AccountRole, string>
    >;
    const out = { ...DEFAULT_ACCOUNT_MAPPING };
    for (const role of ACCOUNT_ROLES) {
      if (stored[role]) out[role] = stored[role];
    }
    return out;
  }

  /** Correspondance rôle → code de journal (valeurs par défaut complétées). */
  static journalMapping(
    settings?: Pick<AccountingSettings, 'journals'> | null,
  ): Record<JournalRole, string> {
    const stored = (settings?.journals ?? {}) as Partial<
      Record<JournalRole, string>
    >;
    const out = { ...DEFAULT_JOURNAL_MAPPING };
    for (const role of JOURNAL_ROLES) {
      if (stored[role]) out[role] = stored[role];
    }
    return out;
  }

  /** Met à jour les paramètres (les codes référencés doivent exister). */
  async update(dto: UpdateAccountingSettingsDto): Promise<AccountingSettings> {
    const propertyId = toObjectId(dto.property_id, 'property_id');
    await this.get(dto.property_id);
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, ''> = {};

    if (dto.lock_date === null) {
      $unset.lock_date = '';
    } else if (dto.lock_date !== undefined) {
      $set.lock_date = toAccountingDate(dto.lock_date);
    }
    if (dto.auto_posting !== undefined) $set.auto_posting = dto.auto_posting;
    if (dto.currency) $set.currency = dto.currency;

    if (dto.accounts) {
      const entries = Object.entries(dto.accounts).filter(
        ([, code]) => typeof code === 'string' && code,
      ) as Array<[string, string]>;
      const codes = entries.map(([, code]) => code.trim());
      const found = await this.accountModel
        .find({
          property_id: propertyId,
          code: { $in: codes },
          is_deleted: { $ne: true },
        })
        .lean()
        .exec();
      const known = new Set(found.map((a) => a.code));
      const missing = codes.filter((c) => !known.has(c));
      if (missing.length) {
        throw new BadRequestException(
          `Comptes inexistants dans le plan comptable : ${missing.join(', ')}`,
        );
      }
      for (const [role, code] of entries)
        $set[`accounts.${role}`] = code.trim();
    }

    if (dto.journals) {
      const entries = Object.entries(dto.journals).filter(
        ([, code]) => typeof code === 'string' && code,
      ) as Array<[string, string]>;
      const codes = entries.map(([, code]) => code.trim().toUpperCase());
      const found = await this.journalModel
        .find({
          property_id: propertyId,
          code: { $in: codes },
          is_deleted: { $ne: true },
        })
        .lean()
        .exec();
      const known = new Set(found.map((j) => j.code));
      const missing = codes.filter((c) => !known.has(c));
      if (missing.length) {
        throw new BadRequestException(
          `Journaux inexistants : ${missing.join(', ')}`,
        );
      }
      for (const [role, code] of entries) {
        $set[`journals.${role}`] = code.trim().toUpperCase();
      }
    }

    const update: Record<string, unknown> = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;
    if (Object.keys(update).length === 0) return this.get(dto.property_id);
    return (await this.settingsModel
      .findOneAndUpdate({ property_id: propertyId }, update, {
        new: true,
        runValidators: true,
      })
      .lean()
      .exec()) as unknown as AccountingSettings;
  }

  /**
   * Initialise la comptabilité d'un établissement : plan comptable SYSCOHADA
   * hôtelier, journaux (VTE, ACH, CAI, BNQ, MOB, OD) et paramètres.
   * Idempotent : n'insère que ce qui manque, ne modifie rien d'existant.
   */
  async setup(propertyIdValue: string): Promise<SetupResult> {
    const property_id = toObjectId(propertyIdValue, 'property_id');

    const accountsResult = await this.upsertMany(
      this.accountModel,
      DEFAULT_ACCOUNTS.map((a) => ({
        filter: { property_id, code: a.code, is_deleted: { $ne: true } },
        insert: {
          property_id,
          code: a.code,
          name: a.name,
          account_type: a.account_type,
          syscohada_class: syscohadaClassOf(a.code),
          reconcilable: !!a.reconcilable,
          is_active: true,
          is_deleted: false,
        },
      })),
    );

    const accounts = await this.accountModel
      .find({ property_id, is_deleted: { $ne: true } })
      .lean()
      .exec();
    const accountIdByCode = new Map(accounts.map((a) => [a.code, a._id]));

    const journalsResult = await this.upsertMany(
      this.journalModel,
      DEFAULT_JOURNALS.map((j) => ({
        filter: { property_id, code: j.code, is_deleted: { $ne: true } },
        insert: {
          property_id,
          code: j.code,
          name: j.name,
          type: j.type,
          ...(j.default_account_code &&
          accountIdByCode.has(j.default_account_code)
            ? {
                default_account_id: accountIdByCode.get(j.default_account_code),
              }
            : {}),
          is_active: true,
          is_deleted: false,
        },
      })),
    );

    const settingsResult = await this.upsertMany(this.settingsModel, [
      {
        filter: { property_id },
        insert: {
          property_id,
          auto_posting: true,
          currency: Currency.XOF,
          accounts: { ...DEFAULT_ACCOUNT_MAPPING },
          journals: { ...DEFAULT_JOURNAL_MAPPING },
          is_deleted: false,
        },
      },
    ]);

    return {
      accounts_created: accountsResult,
      journals_created: journalsResult,
      settings_created: settingsResult > 0,
    };
  }

  /** Insère les documents manquants (`$setOnInsert` + upsert) ; renvoie le nombre créé. */
  private async upsertMany<T>(
    model: Model<T>,
    ops: Array<{
      filter: Record<string, unknown>;
      insert: Record<string, unknown>;
    }>,
  ): Promise<number> {
    const run = async () => {
      const result = await model.bulkWrite(
        ops.map((op) => ({
          updateOne: {
            filter: op.filter as never,
            update: { $setOnInsert: op.insert } as never,
            upsert: true,
          },
        })),
        { ordered: false },
      );
      return result.upsertedCount ?? 0;
    };
    try {
      return await run();
    } catch (error) {
      // Initialisation concurrente : une seconde passe ne crée que le reste.
      if (isDuplicateKeyError(error)) return run();
      throw error;
    }
  }
}
