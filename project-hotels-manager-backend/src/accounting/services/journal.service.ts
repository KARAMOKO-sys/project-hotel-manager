import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { Journal } from '../schemas/journal.entity';
import { Account } from '../schemas/account.entity';
import {
  JournalEntry,
  JournalEntryState,
} from '../schemas/journal-entry.entity';
import {
  CreateJournalDto,
  JournalQueryDto,
  UpdateJournalDto,
} from '../dto/journal.dto';
import { escapeRegex, toObjectId } from './accounting.utils';

/** Journaux comptables d'un établissement (code unique = préfixe de numérotation). */
@Injectable()
export class JournalService extends BaseCrudService<
  Journal,
  CreateJournalDto,
  UpdateJournalDto
> {
  constructor(
    @InjectModel(Journal.name) protected readonly journalModel: Model<Journal>,
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    @InjectModel(JournalEntry.name)
    private readonly entryModel: Model<JournalEntry>,
  ) {
    super(journalModel, Journal.name);
  }

  async create(dto: CreateJournalDto): Promise<Journal> {
    const code = dto.code.trim().toUpperCase();
    await this.assertCodeAvailable(dto.property_id, code);
    if (dto.default_account_id) {
      await this.assertAccount(dto.property_id, dto.default_account_id);
    }
    return super.create({
      ...dto,
      code,
      property_id: toObjectId(dto.property_id, 'property_id'),
      default_account_id: dto.default_account_id
        ? toObjectId(dto.default_account_id, 'default_account_id')
        : undefined,
    } as unknown as CreateJournalDto);
  }

  async update(id: string, dto: UpdateJournalDto): Promise<Journal> {
    const existing = await this.findOne(id);
    const propertyId = String(existing.property_id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      if (code !== existing.code) {
        if (await this.hasEntries(id, true)) {
          throw new ConflictException(
            'Impossible de modifier le code d’un journal qui contient des écritures validées',
          );
        }
        await this.assertCodeAvailable(propertyId, code, id);
      }
      data.code = code;
    }
    if (dto.default_account_id) {
      await this.assertAccount(propertyId, dto.default_account_id);
      data.default_account_id = toObjectId(dto.default_account_id);
    }
    return super.update(id, data);
  }

  async remove(id: string): Promise<Journal> {
    await this.findOne(id);
    if (await this.hasEntries(id, false)) {
      throw new ConflictException(
        'Impossible de supprimer un journal qui contient des écritures (désactivez-le)',
      );
    }
    return super.remove(id);
  }

  list(query: JournalQueryDto) {
    const filter: QueryFilter<Journal> = {};
    if (query.property_id) {
      filter.property_id = toObjectId(query.property_id, 'property_id');
    }
    if (query.type) filter.type = query.type;
    if (query.is_active !== undefined) filter.is_active = query.is_active;
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [{ code: regex }, { name: regex }];
    }
    return this.findAll(query, filter);
  }

  protected getDefaultSort(): string {
    return 'code';
  }

  /** Écritures du journal (validées seulement, ou non annulées). */
  private async hasEntries(id: string, postedOnly: boolean) {
    return (
      (await this.entryModel.exists({
        journal_id: toObjectId(id),
        state: postedOnly
          ? JournalEntryState.POSTED
          : { $ne: JournalEntryState.CANCELLED },
      })) !== null
    );
  }

  private async assertAccount(propertyId: string, accountId: string) {
    const exists = await this.accountModel.exists({
      _id: toObjectId(accountId, 'default_account_id'),
      property_id: toObjectId(propertyId, 'property_id'),
      is_deleted: { $ne: true },
    });
    if (!exists) {
      throw new BadRequestException(
        'Le compte par défaut n’appartient pas à cet établissement',
      );
    }
  }

  private async assertCodeAvailable(
    propertyId: string,
    code: string,
    excludeId?: string,
  ) {
    const filter: QueryFilter<Journal> = {
      property_id: toObjectId(propertyId, 'property_id'),
      code,
      is_deleted: { $ne: true },
    };
    if (excludeId) filter._id = { $ne: toObjectId(excludeId) };
    if (await this.repository.exists(filter)) {
      throw new ConflictException(`Le journal ${code} existe déjà`);
    }
  }
}
