import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { SequenceService } from '../../platform/sequences/sequence.service';
import {
  DomainEventPublisher,
  toEventPayload,
} from '../../platform/events/domain-event.publisher';
import { DomainEvents } from '../../platform/events/domain-events';
import {
  JournalEntry,
  JournalEntryLine,
  JournalEntrySource,
  JournalEntryState,
  PartnerType,
} from '../schemas/journal-entry.entity';
import { Account } from '../schemas/account.entity';
import { Journal } from '../schemas/journal.entity';
import { AccountingSettings } from '../schemas/accounting-settings.entity';
import {
  CreateJournalEntryDto,
  JournalEntryLineDto,
  JournalEntryQueryDto,
  UpdateJournalEntryDto,
} from '../dto/journal-entry.dto';
import {
  checkBalance,
  computeTotals,
  dayKey,
  endOfAccountingDay,
  isLocked,
  lineShapeError,
  mirrorLines,
  normalizeLine,
  toAccountingDate,
} from '../domain/accounting.logic';
import { isDuplicateKeyError, toObjectId } from './accounting.utils';

/** Ligne d'écriture automatique exprimée en code de compte. */
export interface AutoEntryLine {
  account_code: string;
  label?: string;
  debit: number;
  credit: number;
  partner_type?: PartnerType;
  partner_id?: string;
}

/** Écriture automatique (facture, paiement, vente POS, facture fournisseur). */
export interface AutoEntryInput {
  property_id: string;
  journal_code: string;
  date: Date;
  reference?: string;
  narration?: string;
  currency?: string;
  lines: AutoEntryLine[];
  source: JournalEntrySource;
  actor_id?: string;
}

export interface ReverseOptions {
  date?: Date | string;
  reason?: string;
  actorId?: string;
  /** Source de l'écriture miroir (idempotence des contre-passations automatiques). */
  source?: JournalEntrySource;
}

/**
 * Écritures comptables : saisie en brouillon, validation (contrôle
 * d'équilibre et de verrouillage, numérotation), contre-passation et
 * annulation. Une écriture validée est immuable.
 */
@Injectable()
export class JournalEntryService extends BaseCrudService<
  JournalEntry,
  CreateJournalEntryDto,
  UpdateJournalEntryDto
> {
  private readonly logger = new Logger(JournalEntryService.name);

  constructor(
    @InjectModel(JournalEntry.name)
    protected readonly entryModel: Model<JournalEntry>,
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    @InjectModel(Journal.name) private readonly journalModel: Model<Journal>,
    @InjectModel(AccountingSettings.name)
    private readonly settingsModel: Model<AccountingSettings>,
    private readonly sequences: SequenceService,
    @Optional() private readonly events?: DomainEventPublisher,
  ) {
    super(entryModel, JournalEntry.name);
  }

  // -------------------------------------------------------------------------
  // Brouillons
  // -------------------------------------------------------------------------

  /** Crée une écriture en brouillon (totaux calculés par le serveur). */
  async create(
    dto: CreateJournalEntryDto,
    actorId?: string,
  ): Promise<JournalEntry> {
    const propertyId = dto.property_id;
    const journal = await this.getJournal(propertyId, dto.journal_id);
    const date = this.parseDate(dto.date);
    await this.assertNotLocked(propertyId, date, 'saisie');
    const lines = await this.resolveLines(propertyId, dto.lines);
    return super.create({
      property_id: toObjectId(propertyId, 'property_id'),
      journal_id: journal._id,
      journal_code: journal.code,
      date,
      reference: dto.reference,
      narration: dto.narration,
      currency: dto.currency,
      lines,
      ...computeTotals(lines),
      state: JournalEntryState.DRAFT,
      ...(actorId && Types.ObjectId.isValid(actorId)
        ? { created_by: new Types.ObjectId(actorId) }
        : {}),
    } as unknown as CreateJournalEntryDto);
  }

  /** Modifie un brouillon (refusé pour une écriture validée ou annulée). */
  async update(id: string, dto: UpdateJournalEntryDto): Promise<JournalEntry> {
    const entry = await this.findOne(id);
    this.assertDraft(entry);
    const propertyId = String(entry.property_id);
    await this.assertNotLocked(propertyId, entry.date, 'modification');

    const $set: Record<string, unknown> = {};
    if (dto.journal_id) {
      const journal = await this.getJournal(propertyId, dto.journal_id);
      $set.journal_id = journal._id;
      $set.journal_code = journal.code;
    }
    if (dto.date) {
      $set.date = this.parseDate(dto.date);
      await this.assertNotLocked(propertyId, $set.date as Date, 'modification');
    }
    if (dto.reference !== undefined) $set.reference = dto.reference;
    if (dto.narration !== undefined) $set.narration = dto.narration;
    if (dto.currency) $set.currency = dto.currency;
    if (dto.lines) {
      const lines = await this.resolveLines(propertyId, dto.lines);
      $set.lines = lines;
      Object.assign($set, computeTotals(lines));
    }

    const updated = await this.entryModel
      .findOneAndUpdate(
        { _id: toObjectId(id), state: JournalEntryState.DRAFT },
        { $set },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException(
        'Seules les écritures en brouillon peuvent être modifiées',
      );
    }
    return updated;
  }

  /** Annule un brouillon (une écriture validée se contre-passe). */
  async cancel(id: string): Promise<JournalEntry> {
    await this.findOne(id);
    const updated = await this.entryModel
      .findOneAndUpdate(
        { _id: toObjectId(id), state: JournalEntryState.DRAFT },
        { $set: { state: JournalEntryState.CANCELLED } },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException(
        'Seules les écritures en brouillon peuvent être annulées (contre-passez une écriture validée)',
      );
    }
    return updated;
  }

  /** Une écriture n'est jamais supprimée : annulation du brouillon. */
  async remove(id: string): Promise<JournalEntry> {
    return this.cancel(id);
  }

  /** Liste paginée filtrée. */
  list(query: JournalEntryQueryDto) {
    const filter: QueryFilter<JournalEntry> = {};
    if (query.property_id) {
      filter.property_id = toObjectId(query.property_id, 'property_id');
    }
    if (query.journal_id) {
      filter.journal_id = toObjectId(query.journal_id, 'journal_id');
    }
    if (query.account_id) {
      filter['lines.account_id'] = toObjectId(query.account_id, 'account_id');
    }
    if (query.state) filter.state = query.state;
    if (query.date_from || query.date_to) {
      const range: Record<string, Date> = {};
      if (query.date_from) range.$gte = this.parseDate(query.date_from);
      if (query.date_to) range.$lte = endOfAccountingDay(query.date_to);
      filter.date = range;
    }
    if (query.search) {
      const regex = new RegExp(
        query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [
        { number: regex },
        { reference: regex },
        { narration: regex },
      ];
    }
    return this.findAll(query, filter);
  }

  protected getDefaultSort(): string {
    return '-date';
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  /**
   * Valide un brouillon : contrôle d'équilibre, de verrouillage et des
   * comptes, passage atomique brouillon → validée, puis numérotation
   * (`<CODE JOURNAL>/<année>/<n°>`) et publication de `accounting.entry.posted`.
   */
  async post(id: string, actorId?: string): Promise<JournalEntry> {
    const entry = (await this.entryModel
      .findById(toObjectId(id))
      .lean()
      .exec()) as unknown as (JournalEntry & { _id: Types.ObjectId }) | null;
    if (!entry || entry.is_deleted) {
      throw new NotFoundException(
        `${JournalEntry.name} introuvable (id: ${id})`,
      );
    }
    if (entry.state !== JournalEntryState.DRAFT) {
      throw new ConflictException(
        entry.state === JournalEntryState.POSTED
          ? 'Écriture déjà validée'
          : 'Une écriture annulée ne peut pas être validée',
      );
    }
    const check = checkBalance(entry.lines);
    if (!check.ok) throw new BadRequestException(check.errors.join(' ; '));

    const propertyId = String(entry.property_id);
    await this.assertNotLocked(propertyId, entry.date, 'validation');
    await this.assertAccountsUsable(
      propertyId,
      entry.lines.map((l) => String(l.account_id)),
    );
    const journal = await this.getJournal(propertyId, String(entry.journal_id));

    const claimed = await this.entryModel
      .findOneAndUpdate(
        {
          _id: entry._id,
          state: JournalEntryState.DRAFT,
          updated_at: entry.updated_at,
        },
        {
          $set: {
            state: JournalEntryState.POSTED,
            posted_at: new Date(),
            total_debit: check.total_debit,
            total_credit: check.total_credit,
            journal_code: journal.code,
            ...(actorId && Types.ObjectId.isValid(actorId)
              ? { posted_by: new Types.ObjectId(actorId) }
              : {}),
          },
        },
        { new: true },
      )
      .exec();
    if (!claimed) {
      throw new ConflictException(
        'L’écriture a été modifiée ou validée entre-temps ; rechargez-la',
      );
    }

    // Numéro attribué après la transition atomique : pas de trou en cas de course.
    const number = await this.sequences.next(
      `accounting.entry.${journal.code}`,
      {
        prefix: journal.code,
        scopeId: propertyId,
        date: new Date(entry.date),
      },
    );
    const posted = (await this.entryModel
      .findByIdAndUpdate(entry._id, { $set: { number } }, { new: true })
      .exec()) as unknown as JournalEntry;

    await this.publish(DomainEvents.JOURNAL_ENTRY_POSTED, posted, actorId);
    return posted;
  }

  // -------------------------------------------------------------------------
  // Contre-passation
  // -------------------------------------------------------------------------

  /**
   * Contre-passe une écriture validée : crée et valide l'écriture miroir
   * (débit ↔ crédit), relie les deux écritures et publie
   * `accounting.entry.reversed`.
   */
  async reverse(
    id: string,
    options: ReverseOptions = {},
  ): Promise<{ original: JournalEntry; reversal: JournalEntry }> {
    const original = (await this.entryModel
      .findById(toObjectId(id))
      .lean()
      .exec()) as unknown as (JournalEntry & { _id: Types.ObjectId }) | null;
    if (!original || original.is_deleted) {
      throw new NotFoundException(
        `${JournalEntry.name} introuvable (id: ${id})`,
      );
    }
    if (original.state !== JournalEntryState.POSTED) {
      throw new ConflictException(
        'Seules les écritures validées peuvent être contre-passées',
      );
    }
    if (original.reversed_entry_id) {
      throw new ConflictException('Écriture déjà contre-passée');
    }
    const propertyId = String(original.property_id);
    const date = options.date
      ? this.parseDate(options.date)
      : toAccountingDate(new Date());
    await this.assertNotLocked(propertyId, original.date, 'contre-passation');
    await this.assertNotLocked(propertyId, date, 'contre-passation');

    const reversalId = new Types.ObjectId();
    const claimed = await this.entryModel
      .findOneAndUpdate(
        {
          _id: original._id,
          state: JournalEntryState.POSTED,
          reversed_entry_id: null,
        },
        { $set: { reversed_entry_id: reversalId } },
        { new: true },
      )
      .exec();
    if (!claimed) throw new ConflictException('Écriture déjà contre-passée');

    let reversal: JournalEntry;
    try {
      const lines = mirrorLines(
        original.lines.map((l) => ({
          account_id: l.account_id,
          account_code: l.account_code,
          label: l.label,
          debit: l.debit,
          credit: l.credit,
          partner_type: l.partner_type,
          partner_id: l.partner_id,
        })),
      );
      const ref = original.number ?? String(original._id);
      await this.entryModel.create({
        _id: reversalId,
        property_id: original.property_id,
        journal_id: original.journal_id,
        journal_code: original.journal_code,
        date,
        reference: original.reference,
        narration: `Contre-passation de ${ref}${options.reason ? ` : ${options.reason}` : ''}`,
        currency: original.currency,
        lines,
        ...computeTotals(lines),
        state: JournalEntryState.DRAFT,
        reversal_of_id: original._id,
        ...(options.source ? { source: options.source } : {}),
      });
      reversal = await this.post(String(reversalId), options.actorId);
    } catch (error) {
      // Compensation : on libère l'écriture d'origine.
      await this.entryModel
        .deleteOne({ _id: reversalId, state: JournalEntryState.DRAFT })
        .exec()
        .catch(() => undefined);
      await this.entryModel
        .updateOne(
          { _id: original._id, reversed_entry_id: reversalId },
          { $unset: { reversed_entry_id: '' } },
        )
        .exec()
        .catch(() => undefined);
      throw error;
    }

    const updatedOriginal = (await this.entryModel
      .findById(original._id)
      .exec()) as unknown as JournalEntry;
    if (this.events) {
      await this.events.publish(DomainEvents.JOURNAL_ENTRY_REVERSED, {
        property_id: propertyId,
        actor_id: options.actorId,
        record: { model: JournalEntry.name, id: String(original._id) },
        payload: {
          original: toEventPayload(updatedOriginal),
          reversal: toEventPayload(reversal),
        },
      });
    }
    return { original: updatedOriginal, reversal };
  }

  // -------------------------------------------------------------------------
  // Comptabilisation automatique
  // -------------------------------------------------------------------------

  /** Écriture issue d'un document métier (clé d'idempotence). */
  async findBySource(
    model: string,
    id: string,
    event: string,
  ): Promise<(JournalEntry & { _id: Types.ObjectId }) | null> {
    return await this.entryModel
      .findOne({
        'source.model': model,
        'source.id': id,
        'source.event': event,
      })
      .lean()
      .exec();
  }

  /**
   * Crée et valide une écriture automatique. Idempotent : si une écriture
   * existe déjà pour la même source, elle est renvoyée (et validée si elle
   * était restée en brouillon).
   */
  async createAndPost(
    input: AutoEntryInput,
  ): Promise<{ entry: JournalEntry; created: boolean }> {
    const { model, id, event } = input.source;
    const existing = await this.findBySource(model, id, event);
    if (existing) return this.resumeExisting(existing, input.actor_id);

    const propertyId = toObjectId(input.property_id, 'property_id');
    const journal = (await this.journalModel
      .findOne({
        property_id: propertyId,
        code: input.journal_code,
        is_deleted: { $ne: true },
      })
      .lean()
      .exec()) as unknown as (Journal & { _id: Types.ObjectId }) | null;
    if (!journal) {
      throw new Error(`Journal ${input.journal_code} introuvable`);
    }
    const codes = [...new Set(input.lines.map((l) => l.account_code))];
    const accounts = await this.accountModel
      .find({
        property_id: propertyId,
        code: { $in: codes },
        is_deleted: { $ne: true },
      })
      .lean()
      .exec();
    const byCode = new Map(accounts.map((a) => [a.code, a]));
    const missing = codes.filter((c) => !byCode.has(c));
    if (missing.length) {
      throw new Error(`Comptes introuvables : ${missing.join(', ')}`);
    }
    const lines = input.lines.map((l) => {
      const account = byCode.get(l.account_code)!;
      return {
        ...normalizeLine(l),
        account_id: account._id,
        account_code: account.code,
        label: l.label,
        partner_type: l.partner_id ? l.partner_type : undefined,
        partner_id:
          l.partner_id && Types.ObjectId.isValid(l.partner_id)
            ? new Types.ObjectId(l.partner_id)
            : undefined,
      };
    });

    let created: { _id: Types.ObjectId };
    try {
      created = await this.entryModel.create({
        property_id: propertyId,
        journal_id: journal._id,
        journal_code: journal.code,
        date: toAccountingDate(input.date),
        reference: input.reference,
        narration: input.narration,
        currency: input.currency || undefined,
        lines,
        ...computeTotals(lines),
        state: JournalEntryState.DRAFT,
        source: input.source,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const raced = await this.findBySource(model, id, event);
      if (!raced) throw error;
      return this.resumeExisting(raced, input.actor_id);
    }
    const entry = await this.post(String(created._id), input.actor_id);
    return { entry, created: true };
  }

  private async resumeExisting(
    existing: JournalEntry & { _id: Types.ObjectId },
    actorId?: string,
  ): Promise<{ entry: JournalEntry; created: boolean }> {
    if (existing.state === JournalEntryState.DRAFT) {
      return {
        entry: await this.post(String(existing._id), actorId),
        created: false,
      };
    }
    return { entry: existing, created: false };
  }

  // -------------------------------------------------------------------------
  // Contrôles
  // -------------------------------------------------------------------------

  private assertDraft(entry: JournalEntry) {
    if (entry.state !== JournalEntryState.DRAFT) {
      throw new ConflictException(
        entry.state === JournalEntryState.POSTED
          ? 'Une écriture validée est immuable (contre-passez-la)'
          : 'Une écriture annulée ne peut pas être modifiée',
      );
    }
  }

  private parseDate(value: Date | string): Date {
    try {
      return toAccountingDate(value);
    } catch {
      throw new BadRequestException('Date invalide');
    }
  }

  /** Refuse toute opération sur une date antérieure ou égale à la date de verrouillage. */
  async assertNotLocked(
    propertyId: string,
    date: Date | string,
    operation: string,
  ): Promise<void> {
    const settings = (await this.settingsModel
      .findOne({ property_id: toObjectId(propertyId, 'property_id') })
      .lean()
      .exec()) as unknown as AccountingSettings | null;
    if (isLocked(date, settings?.lock_date)) {
      throw new BadRequestException(
        `Période verrouillée jusqu’au ${dayKey(settings!.lock_date!)} : ${operation} impossible pour une écriture du ${dayKey(date)}`,
      );
    }
  }

  private async getJournal(
    propertyId: string,
    journalId: string,
  ): Promise<Journal & { _id: Types.ObjectId }> {
    const journal = (await this.journalModel
      .findOne({
        _id: toObjectId(journalId, 'journal_id'),
        property_id: toObjectId(propertyId, 'property_id'),
        is_deleted: { $ne: true },
      })
      .lean()
      .exec()) as unknown as (Journal & { _id: Types.ObjectId }) | null;
    if (!journal) {
      throw new BadRequestException(
        'Journal introuvable pour cet établissement',
      );
    }
    if (journal.is_active === false) {
      throw new BadRequestException(`Le journal ${journal.code} est inactif`);
    }
    return journal;
  }

  /** Vérifie les comptes et construit les lignes (montants arrondis, code copié). */
  private async resolveLines(
    propertyId: string,
    input: JournalEntryLineDto[],
  ): Promise<JournalEntryLine[]> {
    const errors = input
      .map((line, index) => lineShapeError(line, index))
      .filter((e): e is string => !!e);
    if (errors.length) throw new BadRequestException(errors.join(' ; '));
    const accounts = await this.assertAccountsUsable(
      propertyId,
      input.map((l) => l.account_id),
    );
    return input.map((line) => {
      const normalized = normalizeLine(line);
      return {
        account_id: toObjectId(line.account_id, 'account_id'),
        account_code: accounts.get(line.account_id)!.code,
        label: line.label,
        debit: normalized.debit,
        credit: normalized.credit,
        partner_type: line.partner_id ? line.partner_type : undefined,
        partner_id: line.partner_id
          ? toObjectId(line.partner_id, 'partner_id')
          : undefined,
      };
    });
  }

  /** Les comptes doivent exister dans l'établissement, être actifs et non supprimés. */
  private async assertAccountsUsable(
    propertyId: string,
    accountIds: string[],
  ): Promise<Map<string, Account>> {
    const ids = [...new Set(accountIds.map(String))];
    const accounts = (await this.accountModel
      .find({
        _id: { $in: ids.map((id) => toObjectId(id, 'account_id')) },
        property_id: toObjectId(propertyId, 'property_id'),
        is_deleted: { $ne: true },
      })
      .lean()
      .exec()) as unknown as Array<Account & { _id: Types.ObjectId }>;
    const byId = new Map(accounts.map((a) => [String(a._id), a]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Comptes introuvables pour cet établissement : ${missing.join(', ')}`,
      );
    }
    const inactive = [...byId.values()].filter((a) => a.is_active === false);
    if (inactive.length) {
      throw new BadRequestException(
        `Comptes inactifs : ${inactive.map((a) => a.code).join(', ')}`,
      );
    }
    return byId;
  }

  private async publish(
    name: typeof DomainEvents.JOURNAL_ENTRY_POSTED,
    entry: JournalEntry,
    actorId?: string,
  ) {
    if (!this.events) return;
    try {
      const payload = toEventPayload(entry);
      await this.events.publish(name, {
        property_id: String(entry.property_id),
        actor_id: actorId,
        record: { model: JournalEntry.name, id: String(payload._id) },
        payload,
      });
    } catch (error) {
      this.logger.error(
        `Publication ${name} impossible : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
