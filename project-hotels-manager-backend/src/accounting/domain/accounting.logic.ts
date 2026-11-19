import { AccountType, PartnerType } from './accounting.enums';

/**
 * Fonctions pures de la comptabilité (sans accès base de données) :
 * contrôle d'équilibre, dates de verrouillage, balance générale, grand livre,
 * compte de résultat, bilan et balance âgée clients, selon le SYSCOHADA.
 */

/** Arrondi monétaire à 2 décimales (sans « -0 »). */
export function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

// ---------------------------------------------------------------------------
// Plan comptable
// ---------------------------------------------------------------------------

/** Un code de compte SYSCOHADA : chiffres uniquement, premier chiffre 1–9. */
export const ACCOUNT_CODE_PATTERN = /^[1-9][0-9]{1,11}$/;

/** Classe SYSCOHADA (1–9) déduite du premier chiffre du code, ou `null`. */
export function syscohadaClassOf(code: string): number | null {
  const normalized = (code ?? '').trim();
  if (!ACCOUNT_CODE_PATTERN.test(normalized)) return null;
  return Number(normalized[0]);
}

/**
 * Nature par défaut d'un compte d'après son code SYSCOHADA (utilisée quand
 * l'utilisateur ne la précise pas).
 */
export function defaultAccountType(code: string): AccountType | null {
  const cls = syscohadaClassOf(code);
  if (cls === null) return null;
  const two = code.slice(0, 2);
  const three = code.slice(0, 3);
  switch (cls) {
    case 1:
      return ['16', '17', '18', '19'].includes(two)
        ? AccountType.LIABILITY
        : AccountType.EQUITY;
    case 2:
    case 3:
      return AccountType.ASSET;
    case 4:
      if (['409', '421', '445'].includes(three)) return AccountType.ASSET;
      if (three === '419') return AccountType.LIABILITY;
      if (['40', '42', '43', '44', '48'].includes(two)) {
        return AccountType.LIABILITY;
      }
      return AccountType.ASSET;
    case 5:
      return two === '56' ? AccountType.LIABILITY : AccountType.ASSET;
    case 6:
      return AccountType.EXPENSE;
    case 7:
      return AccountType.INCOME;
    case 8:
      return ['82', '84', '86', '88'].includes(two)
        ? AccountType.INCOME
        : AccountType.EXPENSE;
    default:
      return AccountType.OFF_BALANCE;
  }
}

// ---------------------------------------------------------------------------
// Dates comptables et verrouillage
// ---------------------------------------------------------------------------

/** Clé jour `AAAA-MM-JJ` (UTC) d'une date. */
export function dayKey(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

/** Date comptable : la journée (minuit UTC) d'une date ou d'une chaîne ISO. */
export function toAccountingDate(value: Date | string): Date {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error('Date invalide');
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Fin de journée (UTC) — borne incluse des filtres de période. */
export function endOfAccountingDay(value: Date | string): Date {
  const day = toAccountingDate(value);
  return new Date(day.getTime() + 24 * 3600 * 1000 - 1);
}

/** Vrai si la date est antérieure ou égale à la date de verrouillage. */
export function isLocked(
  date: Date | string,
  lockDate?: Date | string | null,
): boolean {
  if (!lockDate) return false;
  return dayKey(date) <= dayKey(lockDate);
}

// ---------------------------------------------------------------------------
// Lignes d'écriture et équilibre
// ---------------------------------------------------------------------------

export interface EntryLineAmounts {
  debit?: number | null;
  credit?: number | null;
}

export interface BalanceCheck {
  ok: boolean;
  errors: string[];
  total_debit: number;
  total_credit: number;
  /** Débit − crédit (arrondi). */
  difference: number;
}

/** Arrondit les montants d'une ligne (absents → 0). */
export function normalizeLine<T extends EntryLineAmounts>(
  line: T,
): T & { debit: number; credit: number } {
  return {
    ...line,
    debit: round2(Number(line.debit ?? 0)),
    credit: round2(Number(line.credit ?? 0)),
  };
}

/** Erreur de forme d'une ligne (montants), ou `null` si elle est valide. */
export function lineShapeError(
  line: EntryLineAmounts,
  index: number,
): string | null {
  const debit = Number(line.debit ?? 0);
  const credit = Number(line.credit ?? 0);
  const label = `Ligne ${index + 1}`;
  if (!Number.isFinite(debit) || !Number.isFinite(credit)) {
    return `${label} : montant invalide`;
  }
  if (debit < 0 || credit < 0) {
    return `${label} : les montants doivent être positifs`;
  }
  const d = round2(debit);
  const c = round2(credit);
  if (d > 0 && c > 0) {
    return `${label} : une ligne ne peut pas porter à la fois un débit et un crédit`;
  }
  if (d === 0 && c === 0) {
    return `${label} : le débit ou le crédit doit être supérieur à zéro`;
  }
  return null;
}

/** Totaux débit / crédit arrondis. */
export function computeTotals(lines: EntryLineAmounts[]): {
  total_debit: number;
  total_credit: number;
} {
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    debit += round2(Number(line.debit ?? 0));
    credit += round2(Number(line.credit ?? 0));
  }
  return { total_debit: round2(debit), total_credit: round2(credit) };
}

/**
 * Contrôle complet avant validation : au moins deux lignes, chaque ligne a
 * exactement un montant strictement positif, Σ débit = Σ crédit (2 décimales).
 */
export function checkBalance(lines: EntryLineAmounts[]): BalanceCheck {
  const errors: string[] = [];
  if (!Array.isArray(lines) || lines.length < 2) {
    errors.push('Une écriture doit comporter au moins deux lignes');
  }
  (lines ?? []).forEach((line, index) => {
    const error = lineShapeError(line, index);
    if (error) errors.push(error);
  });
  const totals = computeTotals(lines ?? []);
  const difference = round2(totals.total_debit - totals.total_credit);
  if (difference !== 0) {
    errors.push(
      `Écriture déséquilibrée : débit ${totals.total_debit} ≠ crédit ${totals.total_credit}`,
    );
  }
  return { ok: errors.length === 0, errors, ...totals, difference };
}

/** Lignes miroir (débit ↔ crédit) pour une contre-passation. */
export function mirrorLines<T extends EntryLineAmounts>(lines: T[]): T[] {
  return lines.map((line) => ({
    ...line,
    debit: round2(Number(line.credit ?? 0)),
    credit: round2(Number(line.debit ?? 0)),
  }));
}

// ---------------------------------------------------------------------------
// Balance générale
// ---------------------------------------------------------------------------

export interface AccountInfo {
  id: string;
  code: string;
  name: string;
  account_type: AccountType | string;
  syscohada_class: number;
}

/** Mouvements agrégés d'un compte (issus de l'agrégation Mongo). */
export interface AccountMovementRow {
  account_id: string;
  opening_debit: number;
  opening_credit: number;
  debit: number;
  credit: number;
}

export interface TrialBalanceLine {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  syscohada_class: number;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

export interface TrialBalance {
  lines: TrialBalanceLine[];
  totals: Omit<
    TrialBalanceLine,
    'account_id' | 'code' | 'name' | 'account_type' | 'syscohada_class'
  >;
  balanced: boolean;
}

function splitBalance(balance: number): [number, number] {
  const b = round2(balance);
  return b >= 0 ? [b, 0] : [0, round2(-b)];
}

const compareCodes = (a: { code: string }, b: { code: string }) =>
  a.code.localeCompare(b.code);

/**
 * Balance générale à 6 colonnes (solde d'ouverture, mouvements de la période,
 * solde de clôture), triée par code de compte. Les comptes sans mouvement sont
 * omis.
 */
export function buildTrialBalance(
  rows: AccountMovementRow[],
  accounts: AccountInfo[],
): TrialBalance {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const lines: TrialBalanceLine[] = [];
  for (const row of rows) {
    const account = byId.get(String(row.account_id));
    if (!account) continue;
    const opening = round2(row.opening_debit - row.opening_credit);
    const [openingDebit, openingCredit] = splitBalance(opening);
    const closing = round2(opening + row.debit - row.credit);
    const [closingDebit, closingCredit] = splitBalance(closing);
    const line: TrialBalanceLine = {
      account_id: account.id,
      code: account.code,
      name: account.name,
      account_type: account.account_type,
      syscohada_class: account.syscohada_class,
      opening_debit: openingDebit,
      opening_credit: openingCredit,
      period_debit: round2(row.debit),
      period_credit: round2(row.credit),
      closing_debit: closingDebit,
      closing_credit: closingCredit,
    };
    if (
      line.opening_debit ||
      line.opening_credit ||
      line.period_debit ||
      line.period_credit
    ) {
      lines.push(line);
    }
  }
  lines.sort(compareCodes);
  const sum = (key: keyof TrialBalance['totals']) =>
    round2(lines.reduce((s, l) => s + l[key], 0));
  const totals = {
    opening_debit: sum('opening_debit'),
    opening_credit: sum('opening_credit'),
    period_debit: sum('period_debit'),
    period_credit: sum('period_credit'),
    closing_debit: sum('closing_debit'),
    closing_credit: sum('closing_credit'),
  };
  return {
    lines,
    totals,
    balanced:
      totals.period_debit === totals.period_credit &&
      totals.closing_debit === totals.closing_credit,
  };
}

// ---------------------------------------------------------------------------
// Grand livre
// ---------------------------------------------------------------------------

export interface LedgerLineInput {
  date: Date | string;
  debit: number;
  credit: number;
  [key: string]: unknown;
}

export interface LedgerResult<T extends LedgerLineInput> {
  opening_balance: number;
  lines: Array<T & { balance: number }>;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
}

/** Grand livre d'un compte : solde progressif (débit − crédit). */
export function buildGeneralLedger<T extends LedgerLineInput>(
  openingBalance: number,
  lines: T[],
): LedgerResult<T> {
  let balance = round2(openingBalance);
  let totalDebit = 0;
  let totalCredit = 0;
  const out = lines.map((line) => {
    balance = round2(balance + line.debit - line.credit);
    totalDebit += line.debit;
    totalCredit += line.credit;
    return { ...line, balance };
  });
  return {
    opening_balance: round2(openingBalance),
    lines: out,
    total_debit: round2(totalDebit),
    total_credit: round2(totalCredit),
    closing_balance: balance,
  };
}

// ---------------------------------------------------------------------------
// Compte de résultat et bilan
// ---------------------------------------------------------------------------

/** Solde d'un compte sur une période (ou cumulé à une date). */
export interface AccountBalance extends AccountInfo {
  debit: number;
  credit: number;
}

export interface ReportAccountLine {
  account_id: string;
  code: string;
  name: string;
  amount: number;
}

export interface ReportGroup {
  key: string;
  label: string;
  accounts: ReportAccountLine[];
  total: number;
}

/** Libellés des rubriques SYSCOHADA (2 chiffres) des classes 6, 7 et 8. */
export const SYSCOHADA_RUBRIC_LABELS: Record<string, string> = {
  '60': 'Achats et variations de stocks',
  '61': 'Transports',
  '62': 'Services extérieurs A',
  '63': 'Services extérieurs B',
  '64': 'Impôts et taxes',
  '65': 'Autres charges',
  '66': 'Charges de personnel',
  '67': 'Frais financiers et charges assimilées',
  '68': 'Dotations aux amortissements',
  '69': 'Dotations aux provisions et dépréciations',
  '70': 'Ventes',
  '71': 'Subventions d’exploitation',
  '72': 'Production immobilisée',
  '73': 'Variations des stocks de biens et services produits',
  '75': 'Autres produits',
  '77': 'Revenus financiers et produits assimilés',
  '78': 'Transferts de charges',
  '79': 'Reprises de provisions et dépréciations',
  '81': 'Valeurs comptables des cessions d’immobilisations',
  '82': 'Produits des cessions d’immobilisations',
  '83': 'Charges hors activités ordinaires',
  '84': 'Produits hors activités ordinaires',
  '85': 'Dotations hors activités ordinaires',
  '86': 'Reprises hors activités ordinaires',
  '87': 'Participation des travailleurs',
  '88': 'Subventions d’équilibre',
  '89': 'Impôts sur le résultat',
};

function groupByRubric(
  items: Array<{ account: AccountBalance; amount: number }>,
): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();
  for (const { account, amount } of items) {
    const key = account.code.slice(0, 2);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: SYSCOHADA_RUBRIC_LABELS[key] ?? `Rubrique ${key}`,
        accounts: [],
        total: 0,
      };
      groups.set(key, group);
    }
    group.accounts.push({
      account_id: account.id,
      code: account.code,
      name: account.name,
      amount: round2(amount),
    });
    group.total = round2(group.total + amount);
  }
  const out = [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
  out.forEach((g) => g.accounts.sort(compareCodes));
  return out;
}

function isIncomeAccount(account: AccountBalance): boolean {
  if (account.syscohada_class === 7) return true;
  return (
    account.syscohada_class === 8 &&
    String(account.account_type) === String(AccountType.INCOME)
  );
}

function isExpenseAccount(account: AccountBalance): boolean {
  if (account.syscohada_class === 6) return true;
  return (
    account.syscohada_class === 8 &&
    String(account.account_type) !== String(AccountType.INCOME)
  );
}

export interface IncomeStatement {
  income: { groups: ReportGroup[]; total: number };
  expenses: { groups: ReportGroup[]; total: number };
  /** Produits − charges (positif : bénéfice). */
  net_result: number;
}

/**
 * Compte de résultat : produits (classe 7 et produits HAO de la classe 8) et
 * charges (classe 6 et charges HAO), regroupés par rubrique SYSCOHADA.
 */
export function buildIncomeStatement(
  balances: AccountBalance[],
): IncomeStatement {
  const income = balances
    .filter(isIncomeAccount)
    .map((account) => ({ account, amount: account.credit - account.debit }))
    .filter((i) => round2(i.amount) !== 0);
  const expenses = balances
    .filter(isExpenseAccount)
    .map((account) => ({ account, amount: account.debit - account.credit }))
    .filter((i) => round2(i.amount) !== 0);
  const incomeGroups = groupByRubric(income);
  const expenseGroups = groupByRubric(expenses);
  const incomeTotal = round2(incomeGroups.reduce((s, g) => s + g.total, 0));
  const expenseTotal = round2(expenseGroups.reduce((s, g) => s + g.total, 0));
  return {
    income: { groups: incomeGroups, total: incomeTotal },
    expenses: { groups: expenseGroups, total: expenseTotal },
    net_result: round2(incomeTotal - expenseTotal),
  };
}

export interface BalanceSheetSection {
  key: string;
  label: string;
  accounts: ReportAccountLine[];
  total: number;
}

export interface BalanceSheet {
  assets: {
    sections: BalanceSheetSection[];
    total: number;
  };
  liabilities: {
    sections: BalanceSheetSection[];
    total: number;
  };
  /** Résultat non encore affecté (classes 6, 7 et 8) inclus aux capitaux propres. */
  period_result: number;
  balanced: boolean;
}

/**
 * Bilan SYSCOHADA à une date à partir des soldes cumulés :
 * - actif : immobilisé (classe 2, net des amortissements), stocks (classe 3),
 *   créances (comptes de classe 4 à solde débiteur), trésorerie-actif
 *   (classe 5 débitrice) ;
 * - passif : capitaux propres (10–15 + résultat non affecté), dettes
 *   financières (16–19), passif circulant (classe 4 créditrice),
 *   trésorerie-passif (classe 5 créditrice).
 * La classe 9 (engagements hors bilan) est exclue.
 */
export function buildBalanceSheet(balances: AccountBalance[]): BalanceSheet {
  const sections = {
    fixed_assets: newSection('fixed_assets', 'Actif immobilisé'),
    inventories: newSection('inventories', 'Stocks'),
    receivables: newSection('receivables', 'Créances et emplois assimilés'),
    cash_assets: newSection('cash_assets', 'Trésorerie – actif'),
    equity: newSection('equity', 'Capitaux propres et ressources assimilées'),
    financial_debts: newSection('financial_debts', 'Dettes financières'),
    current_liabilities: newSection('current_liabilities', 'Passif circulant'),
    cash_liabilities: newSection('cash_liabilities', 'Trésorerie – passif'),
  };
  let result = 0;

  for (const account of balances) {
    const net = round2(account.debit - account.credit);
    switch (account.syscohada_class) {
      case 1: {
        const target = ['16', '17', '18', '19'].includes(
          account.code.slice(0, 2),
        )
          ? sections.financial_debts
          : sections.equity;
        addToSection(target, account, -net);
        break;
      }
      case 2:
        addToSection(sections.fixed_assets, account, net);
        break;
      case 3:
        addToSection(sections.inventories, account, net);
        break;
      case 4:
        if (net >= 0) addToSection(sections.receivables, account, net);
        else addToSection(sections.current_liabilities, account, -net);
        break;
      case 5:
        if (net >= 0) addToSection(sections.cash_assets, account, net);
        else addToSection(sections.cash_liabilities, account, -net);
        break;
      case 6:
      case 7:
      case 8:
        result -= net;
        break;
      default:
        break;
    }
  }

  const periodResult = round2(result);
  if (periodResult !== 0) {
    sections.equity.accounts.push({
      account_id: '',
      code: '13',
      name: 'Résultat de l’exercice (non affecté)',
      amount: periodResult,
    });
    sections.equity.total = round2(sections.equity.total + periodResult);
  }

  const assetSections = [
    sections.fixed_assets,
    sections.inventories,
    sections.receivables,
    sections.cash_assets,
  ];
  const liabilitySections = [
    sections.equity,
    sections.financial_debts,
    sections.current_liabilities,
    sections.cash_liabilities,
  ];
  for (const s of [...assetSections, ...liabilitySections]) {
    s.accounts.sort(compareCodes);
  }
  const assetsTotal = round2(assetSections.reduce((s, x) => s + x.total, 0));
  const liabilitiesTotal = round2(
    liabilitySections.reduce((s, x) => s + x.total, 0),
  );
  return {
    assets: { sections: assetSections, total: assetsTotal },
    liabilities: { sections: liabilitySections, total: liabilitiesTotal },
    period_result: periodResult,
    balanced: assetsTotal === liabilitiesTotal,
  };
}

function newSection(key: string, label: string): BalanceSheetSection {
  return { key, label, accounts: [], total: 0 };
}

function addToSection(
  section: BalanceSheetSection,
  account: AccountBalance,
  amount: number,
) {
  const value = round2(amount);
  if (value === 0) return;
  section.accounts.push({
    account_id: account.id,
    code: account.code,
    name: account.name,
    amount: value,
  });
  section.total = round2(section.total + value);
}

// ---------------------------------------------------------------------------
// Balance âgée clients
// ---------------------------------------------------------------------------

export interface ReceivableLine {
  date: Date | string;
  debit: number;
  credit: number;
  partner_type?: PartnerType | string | null;
  partner_id?: string | null;
}

export type AgingBucket = 'current' | 'days_31_60' | 'days_61_90' | 'over_90';

export interface PartnerAging {
  partner_type: string | null;
  partner_id: string | null;
  buckets: Record<AgingBucket, number>;
  /** Avoirs / encaissements non imputés (solde créditeur). */
  unallocated_credit: number;
  /** Solde net du tiers (créances ouvertes − crédits non imputés). */
  balance: number;
}

export interface ReceivablesAging {
  as_of: string;
  partners: PartnerAging[];
  totals: Record<AgingBucket, number> & {
    unallocated_credit: number;
    balance: number;
  };
}

const emptyBuckets = (): Record<AgingBucket, number> => ({
  current: 0,
  days_31_60: 0,
  days_61_90: 0,
  over_90: 0,
});

/** Tranche d'ancienneté d'une créance (en jours depuis sa date). */
export function agingBucket(
  date: Date | string,
  asOf: Date | string,
): AgingBucket {
  const days = Math.floor(
    (toAccountingDate(asOf).getTime() - toAccountingDate(date).getTime()) /
      (24 * 3600 * 1000),
  );
  if (days <= 30) return 'current';
  if (days <= 60) return 'days_31_60';
  if (days <= 90) return 'days_61_90';
  return 'over_90';
}

/**
 * Balance âgée : par tiers, les crédits (encaissements, avoirs) sont imputés
 * sur les débits les plus anciens (FIFO) ; les débits restants sont classés
 * par ancienneté. Les tiers soldés sont omis.
 */
export function buildReceivablesAging(
  lines: ReceivableLine[],
  asOf: Date | string,
): ReceivablesAging {
  const byPartner = new Map<string, ReceivableLine[]>();
  for (const line of lines) {
    const key = `${line.partner_type ?? ''}|${line.partner_id ?? ''}`;
    const list = byPartner.get(key) ?? [];
    list.push(line);
    byPartner.set(key, list);
  }

  const partners: PartnerAging[] = [];
  for (const partnerLines of byPartner.values()) {
    const sorted = [...partnerLines].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const openDebits: Array<{ date: Date | string; amount: number }> = [];
    let credit = 0;
    for (const line of sorted) {
      if (line.debit > 0) {
        openDebits.push({ date: line.date, amount: round2(line.debit) });
      }
      credit = round2(credit + (line.credit ?? 0));
    }
    // Imputation FIFO des crédits sur les débits les plus anciens.
    for (const debit of openDebits) {
      if (credit <= 0) break;
      const used = Math.min(debit.amount, credit);
      debit.amount = round2(debit.amount - used);
      credit = round2(credit - used);
    }
    const buckets = emptyBuckets();
    for (const debit of openDebits) {
      if (debit.amount <= 0) continue;
      const bucket = agingBucket(debit.date, asOf);
      buckets[bucket] = round2(buckets[bucket] + debit.amount);
    }
    const open = round2(Object.values(buckets).reduce((s, v) => s + v, 0));
    const balance = round2(open - credit);
    if (open === 0 && credit === 0) continue;
    partners.push({
      partner_type: sorted[0].partner_type ?? null,
      partner_id: sorted[0].partner_id ?? null,
      buckets,
      unallocated_credit: credit,
      balance,
    });
  }
  partners.sort((a, b) => b.balance - a.balance);

  const totals = {
    ...emptyBuckets(),
    unallocated_credit: 0,
    balance: 0,
  };
  for (const p of partners) {
    for (const key of Object.keys(p.buckets) as AgingBucket[]) {
      totals[key] = round2(totals[key] + p.buckets[key]);
    }
    totals.unallocated_credit = round2(
      totals.unallocated_credit + p.unallocated_credit,
    );
    totals.balance = round2(totals.balance + p.balance);
  }
  return { as_of: dayKey(asOf), partners, totals };
}
