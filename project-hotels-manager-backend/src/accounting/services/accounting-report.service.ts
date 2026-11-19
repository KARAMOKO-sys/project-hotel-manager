import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import {
  JournalEntry,
  JournalEntryState,
} from '../schemas/journal-entry.entity';
import { Account } from '../schemas/account.entity';
import { AccountingSettings } from '../schemas/accounting-settings.entity';
import {
  AccountBalance,
  AccountInfo,
  AccountMovementRow,
  buildBalanceSheet,
  buildGeneralLedger,
  buildIncomeStatement,
  buildReceivablesAging,
  buildTrialBalance,
  dayKey,
  endOfAccountingDay,
  round2,
  toAccountingDate,
} from '../domain/accounting.logic';
import {
  BalanceSheetQueryDto,
  GeneralLedgerQueryDto,
  ReceivablesAgingQueryDto,
  ReportPeriodQueryDto,
} from '../dto/report-query.dto';
import { AccountingSettingsService } from './accounting-settings.service';
import { toObjectId } from './accounting.utils';

interface Period {
  propertyId: Types.ObjectId;
  from?: Date;
  to: Date;
}

/**
 * États comptables en lecture seule, calculés sur les écritures validées :
 * balance générale, grand livre, compte de résultat, bilan, balance âgée.
 */
@Injectable()
export class AccountingReportService {
  constructor(
    @InjectModel(JournalEntry.name)
    private readonly entryModel: Model<JournalEntry>,
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    @InjectModel(AccountingSettings.name)
    private readonly settingsModel: Model<AccountingSettings>,
  ) {}

  /** Balance générale (soldes d'ouverture, mouvements, soldes de clôture). */
  async trialBalance(query: ReportPeriodQueryDto) {
    const period = this.period(
      query.property_id,
      query.date_from,
      query.date_to,
    );
    const [rows, accounts] = await Promise.all([
      this.movements(period),
      this.accounts(period.propertyId),
    ]);
    return {
      ...this.periodInfo(period),
      ...buildTrialBalance(rows, accounts),
    };
  }

  /** Grand livre d'un compte : solde d'ouverture, lignes, solde progressif. */
  async generalLedger(query: GeneralLedgerQueryDto) {
    const period = this.period(
      query.property_id,
      query.date_from,
      query.date_to,
    );
    const accountId = toObjectId(query.account_id, 'account_id');
    const account = await this.accountModel
      .findOne({ _id: accountId, property_id: period.propertyId })
      .lean()
      .exec();
    if (!account) {
      throw new NotFoundException('Compte introuvable pour cet établissement');
    }

    let opening = 0;
    if (period.from) {
      const [row] = await this.entryModel
        .aggregate<{ debit: number; credit: number }>([
          { $match: this.postedMatch(period.propertyId, { $lt: period.from }) },
          { $unwind: '$lines' },
          { $match: { 'lines.account_id': accountId } },
          {
            $group: {
              _id: null,
              debit: { $sum: '$lines.debit' },
              credit: { $sum: '$lines.credit' },
            },
          },
        ])
        .exec();
      opening = round2((row?.debit ?? 0) - (row?.credit ?? 0));
    }

    const dateRange: Record<string, Date> = { $lte: period.to };
    if (period.from) dateRange.$gte = period.from;
    const lines = await this.entryModel
      .aggregate<{
        date: Date;
        debit: number;
        credit: number;
        entry_id: Types.ObjectId;
        number?: string;
        journal_code?: string;
        reference?: string;
        label?: string;
        partner_type?: string;
        partner_id?: Types.ObjectId;
      }>([
        { $match: this.postedMatch(period.propertyId, dateRange) },
        { $unwind: '$lines' },
        { $match: { 'lines.account_id': accountId } },
        { $sort: { date: 1, number: 1, _id: 1 } },
        {
          $project: {
            _id: 0,
            entry_id: '$_id',
            date: 1,
            number: 1,
            journal_code: 1,
            reference: 1,
            label: { $ifNull: ['$lines.label', '$narration'] },
            debit: '$lines.debit',
            credit: '$lines.credit',
            partner_type: '$lines.partner_type',
            partner_id: '$lines.partner_id',
          },
        },
      ])
      .exec();

    return {
      ...this.periodInfo(period),
      account: {
        id: String(account._id),
        code: account.code,
        name: account.name,
        account_type: account.account_type,
        syscohada_class: account.syscohada_class,
      },
      ...buildGeneralLedger(opening, lines),
    };
  }

  /** Compte de résultat de la période (classes 6, 7 et 8). */
  async incomeStatement(query: ReportPeriodQueryDto) {
    const period = this.period(
      query.property_id,
      query.date_from,
      query.date_to,
    );
    const balances = await this.balances(period, false);
    return { ...this.periodInfo(period), ...buildIncomeStatement(balances) };
  }

  /** Bilan à une date (soldes cumulés depuis l'origine). */
  async balanceSheet(query: BalanceSheetQueryDto) {
    const period = this.period(query.property_id, undefined, query.date);
    const balances = await this.balances(period, true);
    return { date: dayKey(period.to), ...buildBalanceSheet(balances) };
  }

  /** Balance âgée des créances clients (compte 411 par défaut), par tiers. */
  async receivablesAging(query: ReceivablesAgingQueryDto) {
    const period = this.period(query.property_id, undefined, query.as_of);
    let account: (Account & { _id: Types.ObjectId }) | null;
    if (query.account_id) {
      account = await this.accountModel
        .findOne({
          _id: toObjectId(query.account_id, 'account_id'),
          property_id: period.propertyId,
        })
        .lean()
        .exec();
    } else {
      const settings = await this.settingsModel
        .findOne({ property_id: period.propertyId })
        .lean()
        .exec();
      const code =
        AccountingSettingsService.accountMapping(settings).receivable;
      account = await this.accountModel
        .findOne({
          property_id: period.propertyId,
          code,
          is_deleted: { $ne: true },
        })
        .lean()
        .exec();
    }
    if (!account) {
      throw new NotFoundException(
        'Compte clients introuvable pour cet établissement',
      );
    }
    const lines = await this.entryModel
      .aggregate<{
        date: Date;
        debit: number;
        credit: number;
        partner_type?: string;
        partner_id?: Types.ObjectId;
      }>([
        { $match: this.postedMatch(period.propertyId, { $lte: period.to }) },
        { $unwind: '$lines' },
        { $match: { 'lines.account_id': account._id } },
        {
          $project: {
            _id: 0,
            date: 1,
            debit: '$lines.debit',
            credit: '$lines.credit',
            partner_type: '$lines.partner_type',
            partner_id: '$lines.partner_id',
          },
        },
      ])
      .exec();
    return {
      account: {
        id: String(account._id),
        code: account.code,
        name: account.name,
      },
      ...buildReceivablesAging(
        lines.map((l) => ({
          ...l,
          partner_id: l.partner_id ? String(l.partner_id) : null,
        })),
        period.to,
      ),
    };
  }

  // -------------------------------------------------------------------------

  private period(propertyId: string, from?: string, to?: string): Period {
    try {
      const period: Period = {
        propertyId: toObjectId(propertyId, 'property_id'),
        from: from ? toAccountingDate(from) : undefined,
        to: endOfAccountingDay(to ?? new Date()),
      };
      if (period.from && period.from > period.to) {
        throw new BadRequestException(
          'La date de début doit précéder la date de fin',
        );
      }
      return period;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Date invalide');
    }
  }

  private periodInfo(period: Period) {
    return {
      date_from: period.from ? dayKey(period.from) : null,
      date_to: dayKey(period.to),
    };
  }

  private postedMatch(propertyId: Types.ObjectId, date: Record<string, Date>) {
    return {
      property_id: propertyId,
      state: JournalEntryState.POSTED,
      is_deleted: { $ne: true },
      date,
    };
  }

  /** Mouvements par compte : avant la période (ouverture) et dans la période. */
  private async movements(period: Period): Promise<AccountMovementRow[]> {
    const from = period.from ?? new Date(0);
    const inPeriod = { $gte: ['$date', from] };
    const pipeline: PipelineStage[] = [
      { $match: this.postedMatch(period.propertyId, { $lte: period.to }) },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.account_id',
          opening_debit: { $sum: { $cond: [inPeriod, 0, '$lines.debit'] } },
          opening_credit: { $sum: { $cond: [inPeriod, 0, '$lines.credit'] } },
          debit: { $sum: { $cond: [inPeriod, '$lines.debit', 0] } },
          credit: { $sum: { $cond: [inPeriod, '$lines.credit', 0] } },
        },
      },
    ];
    const rows = await this.entryModel
      .aggregate<AccountMovementRow & { _id: Types.ObjectId }>(pipeline)
      .exec();
    return rows.map((r) => ({ ...r, account_id: String(r._id) }));
  }

  /** Soldes par compte sur la période (ou cumulés à la date si `cumulative`). */
  private async balances(
    period: Period,
    cumulative: boolean,
  ): Promise<AccountBalance[]> {
    const rows = await this.movements(
      cumulative ? { ...period, from: undefined } : period,
    );
    const accounts = new Map(
      (await this.accounts(period.propertyId)).map((a) => [a.id, a]),
    );
    const out: AccountBalance[] = [];
    for (const row of rows) {
      const account = accounts.get(row.account_id);
      if (!account) continue;
      out.push({ ...account, debit: row.debit, credit: row.credit });
    }
    return out;
  }

  /** Tous les comptes de l'établissement (y compris supprimés, pour l'historique). */
  private async accounts(propertyId: Types.ObjectId): Promise<AccountInfo[]> {
    const accounts = await this.accountModel
      .find({ property_id: propertyId })
      .lean()
      .exec();
    return accounts.map((a) => ({
      id: String(a._id),
      code: a.code,
      name: a.name,
      account_type: a.account_type,
      syscohada_class: a.syscohada_class,
    }));
  }
}
