import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { Account } from '../schemas/account.entity';
import {
  JournalEntry,
  JournalEntryState,
} from '../schemas/journal-entry.entity';
import {
  AccountQueryDto,
  CreateAccountDto,
  UpdateAccountDto,
} from '../dto/account.dto';
import {
  defaultAccountType,
  syscohadaClassOf,
} from '../domain/accounting.logic';
import { escapeRegex, toObjectId } from './accounting.utils';

/**
 * Plan comptable : CRUD des comptes SYSCOHADA d'un établissement.
 * Un compte mouvementé par une écriture validée ne peut être ni supprimé ni
 * recodé.
 */
@Injectable()
export class AccountService extends BaseCrudService<
  Account,
  CreateAccountDto,
  UpdateAccountDto
> {
  constructor(
    @InjectModel(Account.name) protected readonly accountModel: Model<Account>,
    @InjectModel(JournalEntry.name)
    private readonly entryModel: Model<JournalEntry>,
  ) {
    super(accountModel, Account.name);
  }

  async create(dto: CreateAccountDto): Promise<Account> {
    const code = dto.code.trim();
    const syscohada_class = this.classOf(code);
    await this.assertCodeAvailable(dto.property_id, code);
    return super.create({
      ...dto,
      property_id: toObjectId(dto.property_id, 'property_id'),
      code,
      syscohada_class,
      account_type: dto.account_type ?? defaultAccountType(code)!,
    } as unknown as CreateAccountDto);
  }

  async update(id: string, dto: UpdateAccountDto): Promise<Account> {
    const existing = await this.findOne(id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.code && dto.code.trim() !== existing.code) {
      const code = dto.code.trim();
      if (await this.isUsedInPostedEntries(id)) {
        throw new ConflictException(
          'Impossible de modifier le code d’un compte mouvementé par des écritures validées',
        );
      }
      await this.assertCodeAvailable(String(existing.property_id), code, id);
      data.code = code;
      data.syscohada_class = this.classOf(code);
    }
    return super.update(id, data);
  }

  async remove(id: string): Promise<Account> {
    await this.findOne(id);
    if (await this.isUsedInPostedEntries(id)) {
      throw new ConflictException(
        'Impossible de supprimer un compte utilisé dans des écritures validées (désactivez-le)',
      );
    }
    return super.remove(id);
  }

  /** Liste paginée filtrée (établissement, nature, classe, recherche). */
  list(query: AccountQueryDto) {
    const filter: QueryFilter<Account> = {};
    if (query.property_id) {
      filter.property_id = toObjectId(query.property_id, 'property_id');
    }
    if (query.account_type) filter.account_type = query.account_type;
    if (query.syscohada_class) filter.syscohada_class = query.syscohada_class;
    if (query.is_active !== undefined) filter.is_active = query.is_active;
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [{ code: regex }, { name: regex }];
    }
    return this.findAll(query, filter);
  }

  /** Comptes actifs d'un établissement indexés par code. */
  async findByCodes(
    propertyId: string,
    codes: string[],
  ): Promise<Map<string, Account>> {
    const accounts = (await this.accountModel
      .find({
        property_id: toObjectId(propertyId, 'property_id'),
        code: { $in: [...new Set(codes)] },
        is_deleted: { $ne: true },
      })
      .lean()
      .exec()) as unknown as Account[];
    return new Map(accounts.map((a) => [a.code, a]));
  }

  async isUsedInPostedEntries(accountId: string): Promise<boolean> {
    return (
      (await this.entryModel.exists({
        'lines.account_id': toObjectId(accountId),
        state: JournalEntryState.POSTED,
      })) !== null
    );
  }

  protected getDefaultSort(): string {
    return 'code';
  }

  private classOf(code: string): number {
    const cls = syscohadaClassOf(code);
    if (cls === null) {
      throw new BadRequestException(`Code de compte invalide : ${code}`);
    }
    return cls;
  }

  private async assertCodeAvailable(
    propertyId: string,
    code: string,
    excludeId?: string,
  ) {
    const filter: QueryFilter<Account> = {
      property_id: toObjectId(propertyId, 'property_id'),
      code,
      is_deleted: { $ne: true },
    };
    if (excludeId) filter._id = { $ne: toObjectId(excludeId) };
    if (await this.repository.exists(filter)) {
      throw new ConflictException(`Le compte ${code} existe déjà`);
    }
  }
}
