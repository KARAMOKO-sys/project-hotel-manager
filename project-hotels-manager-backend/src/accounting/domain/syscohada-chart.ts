import { AccountType, JournalType } from './accounting.enums';

/**
 * Plan comptable SYSCOHADA révisé (2017) par défaut d'un établissement
 * hôtelier, journaux par défaut et comptes de contrepartie utilisés par la
 * comptabilisation automatique.
 *
 * Choix notables :
 * - hébergement et prestations : 706 « Services vendus » ;
 * - bar, boutique, restauration (point de vente) : 701 « Ventes de marchandises » ;
 * - Mobile Money (Orange Money, MTN MoMo, Wave…) : 552 « Monnaie électronique –
 *   téléphone portable » (classe 55 « Instruments de monnaie électronique »
 *   introduite par le SYSCOHADA révisé) ;
 * - cartes bancaires, virements, chèques, paiements en ligne : 521 « Banques
 *   locales » ;
 * - TVA collectée : 4431 « TVA facturée sur ventes » ; TVA déductible :
 *   4452 « TVA récupérable sur achats ».
 */
export interface DefaultAccount {
  code: string;
  name: string;
  account_type: AccountType;
  reconcilable?: boolean;
}

export const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  // Classe 1 — Ressources durables
  { code: '101', name: 'Capital social', account_type: AccountType.EQUITY },
  { code: '111', name: 'Réserve légale', account_type: AccountType.EQUITY },
  {
    code: '121',
    name: 'Report à nouveau créditeur',
    account_type: AccountType.EQUITY,
  },
  {
    code: '129',
    name: 'Report à nouveau débiteur',
    account_type: AccountType.EQUITY,
  },
  {
    code: '131',
    name: 'Résultat net : bénéfice',
    account_type: AccountType.EQUITY,
  },
  {
    code: '139',
    name: 'Résultat net : perte',
    account_type: AccountType.EQUITY,
  },
  {
    code: '162',
    name: 'Emprunts et dettes auprès des établissements de crédit',
    account_type: AccountType.LIABILITY,
  },
  // Classe 2 — Actif immobilisé
  {
    code: '231',
    name: 'Bâtiments, installations techniques et agencements',
    account_type: AccountType.ASSET,
  },
  {
    code: '241',
    name: 'Matériel et outillage',
    account_type: AccountType.ASSET,
  },
  {
    code: '244',
    name: 'Matériel et mobilier',
    account_type: AccountType.ASSET,
  },
  {
    code: '245',
    name: 'Matériel de transport',
    account_type: AccountType.ASSET,
  },
  {
    code: '283',
    name: 'Amortissements des bâtiments',
    account_type: AccountType.ASSET,
  },
  {
    code: '284',
    name: 'Amortissements du matériel',
    account_type: AccountType.ASSET,
  },
  // Classe 3 — Stocks
  {
    code: '311',
    name: 'Marchandises (boissons, boutique)',
    account_type: AccountType.ASSET,
  },
  {
    code: '321',
    name: 'Matières premières (denrées alimentaires)',
    account_type: AccountType.ASSET,
  },
  {
    code: '331',
    name: 'Matières consommables (produits d’accueil, entretien)',
    account_type: AccountType.ASSET,
  },
  // Classe 4 — Tiers
  {
    code: '401',
    name: 'Fournisseurs, dettes en compte',
    account_type: AccountType.LIABILITY,
    reconcilable: true,
  },
  {
    code: '409',
    name: 'Fournisseurs débiteurs (avances versées)',
    account_type: AccountType.ASSET,
  },
  {
    code: '411',
    name: 'Clients',
    account_type: AccountType.ASSET,
    reconcilable: true,
  },
  {
    code: '419',
    name: 'Clients créditeurs (avances et acomptes reçus)',
    account_type: AccountType.LIABILITY,
  },
  {
    code: '421',
    name: 'Personnel, avances et acomptes',
    account_type: AccountType.ASSET,
  },
  {
    code: '422',
    name: 'Personnel, rémunérations dues',
    account_type: AccountType.LIABILITY,
  },
  {
    code: '431',
    name: 'Sécurité sociale',
    account_type: AccountType.LIABILITY,
  },
  {
    code: '4431',
    name: 'TVA facturée sur ventes',
    account_type: AccountType.LIABILITY,
  },
  {
    code: '4452',
    name: 'TVA récupérable sur achats',
    account_type: AccountType.ASSET,
  },
  {
    code: '447',
    name: 'État, impôts retenus à la source',
    account_type: AccountType.LIABILITY,
  },
  { code: '471', name: 'Comptes d’attente', account_type: AccountType.ASSET },
  // Classe 5 — Trésorerie
  { code: '521', name: 'Banques locales', account_type: AccountType.ASSET },
  {
    code: '552',
    name: 'Monnaie électronique – téléphone portable (Mobile Money)',
    account_type: AccountType.ASSET,
  },
  { code: '571', name: 'Caisse', account_type: AccountType.ASSET },
  { code: '585', name: 'Virements de fonds', account_type: AccountType.ASSET },
  // Classe 6 — Charges
  {
    code: '601',
    name: 'Achats de marchandises',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '602',
    name: 'Achats de matières premières',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '603',
    name: 'Variations des stocks de biens achetés',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '604',
    name: 'Achats stockés de matières et fournitures consommables',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '605',
    name: 'Autres achats (eau, électricité, fournitures)',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '622',
    name: 'Locations et charges locatives',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '624',
    name: 'Entretien, réparations et maintenance',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '625',
    name: 'Primes d’assurance',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '627',
    name: 'Publicité, publications, relations publiques',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '628',
    name: 'Frais de télécommunications',
    account_type: AccountType.EXPENSE,
  },
  { code: '631', name: 'Frais bancaires', account_type: AccountType.EXPENSE },
  {
    code: '632',
    name: 'Rémunérations d’intermédiaires et de conseils (commissions OTA)',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '641',
    name: 'Impôts et taxes directs',
    account_type: AccountType.EXPENSE,
  },
  {
    code: '661',
    name: 'Rémunérations directes versées au personnel national',
    account_type: AccountType.EXPENSE,
  },
  { code: '664', name: 'Charges sociales', account_type: AccountType.EXPENSE },
  {
    code: '681',
    name: 'Dotations aux amortissements d’exploitation',
    account_type: AccountType.EXPENSE,
  },
  // Classe 7 — Produits
  {
    code: '701',
    name: 'Ventes de marchandises (restauration, bar, boutique)',
    account_type: AccountType.INCOME,
  },
  {
    code: '706',
    name: 'Services vendus (hébergement)',
    account_type: AccountType.INCOME,
  },
  {
    code: '707',
    name: 'Produits accessoires',
    account_type: AccountType.INCOME,
  },
  { code: '758', name: 'Produits divers', account_type: AccountType.INCOME },
];

/** Rôle d'un compte de contrepartie dans les paramètres comptables. */
export const ACCOUNT_ROLES = [
  'receivable',
  'payable',
  'revenue_accommodation',
  'revenue_fnb',
  'revenue_other',
  'tax_collected',
  'tax_deductible',
  'cash',
  'bank',
  'mobile_money',
  'purchases',
  'purchases_raw_materials',
  'purchases_supplies',
  'purchases_other',
  'stock',
  'salaries',
  'social_charges',
  'bank_fees',
  'suspense',
] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

/** Codes de comptes par défaut associés à chaque rôle. */
export const DEFAULT_ACCOUNT_MAPPING: Record<AccountRole, string> = {
  receivable: '411',
  payable: '401',
  revenue_accommodation: '706',
  revenue_fnb: '701',
  revenue_other: '707',
  tax_collected: '4431',
  tax_deductible: '4452',
  cash: '571',
  bank: '521',
  mobile_money: '552',
  purchases: '601',
  purchases_raw_materials: '602',
  purchases_supplies: '604',
  purchases_other: '605',
  stock: '311',
  salaries: '661',
  social_charges: '664',
  bank_fees: '631',
  suspense: '471',
};

export interface DefaultJournal {
  code: string;
  name: string;
  type: JournalType;
  default_account_code?: string;
}

export const DEFAULT_JOURNALS: DefaultJournal[] = [
  {
    code: 'VTE',
    name: 'Journal des ventes',
    type: JournalType.SALE,
    default_account_code: '706',
  },
  {
    code: 'ACH',
    name: 'Journal des achats',
    type: JournalType.PURCHASE,
    default_account_code: '601',
  },
  {
    code: 'CAI',
    name: 'Journal de caisse',
    type: JournalType.CASH,
    default_account_code: '571',
  },
  {
    code: 'BNQ',
    name: 'Journal de banque',
    type: JournalType.BANK,
    default_account_code: '521',
  },
  {
    code: 'MOB',
    name: 'Journal Mobile Money',
    type: JournalType.MOBILE_MONEY,
    default_account_code: '552',
  },
  { code: 'OD', name: 'Opérations diverses', type: JournalType.GENERAL },
];

/** Rôle d'un journal dans les paramètres comptables. */
export const JOURNAL_ROLES = [
  'sale',
  'purchase',
  'cash',
  'bank',
  'mobile_money',
  'general',
] as const;

export type JournalRole = (typeof JOURNAL_ROLES)[number];

export const DEFAULT_JOURNAL_MAPPING: Record<JournalRole, string> = {
  sale: 'VTE',
  purchase: 'ACH',
  cash: 'CAI',
  bank: 'BNQ',
  mobile_money: 'MOB',
  general: 'OD',
};

/** Trésorerie utilisée selon le mode de paiement. */
export type TreasuryRole = 'cash' | 'bank' | 'mobile_money';

export function treasuryRoleForMethod(method?: string | null): TreasuryRole {
  switch (method) {
    case 'cash':
      return 'cash';
    case 'mobile_money':
      return 'mobile_money';
    case 'card':
    case 'bank_transfer':
    case 'online':
    case 'check':
      return 'bank';
    default:
      return 'cash';
  }
}
