/** Nature d'un compte du plan comptable. */
export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  INCOME = 'income',
  EXPENSE = 'expense',
  OFF_BALANCE = 'off_balance',
}

/** Type de journal comptable. */
export enum JournalType {
  SALE = 'sale',
  PURCHASE = 'purchase',
  CASH = 'cash',
  BANK = 'bank',
  MOBILE_MONEY = 'mobile_money',
  GENERAL = 'general',
}

/** Cycle de vie d'une écriture comptable. */
export enum JournalEntryState {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

/** Nature du tiers porté par une ligne d'écriture. */
export enum PartnerType {
  GUEST = 'guest',
  VENDOR = 'vendor',
  OTHER = 'other',
}
