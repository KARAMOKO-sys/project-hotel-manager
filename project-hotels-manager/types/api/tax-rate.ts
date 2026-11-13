// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/tax-rate/
// =============================================================================

import type { AuditableEntity, Currency } from "./base-entities";

/** Données de calcul des taxes sur un montant. */
export interface CalculateTaxDto {
  amount: number;
  nights?: number;
  guests?: number;
  /** Date d'application (validité des taux). Défaut : maintenant. */
  date?: string;
  applies_to?: TaxAppliesTo;
}

/** Filtre des taxes applicables. */
export interface ApplicableTaxesQueryDto {
  date?: string;
  applies_to?: TaxAppliesTo;
}

/** DTO de création d'un taux de taxe (TVA, taxe de séjour…). */
export interface CreateTaxRateDto {
  property_id: string;
  name: string;
  code: string;
  description?: string;
  tax_type?: TaxType;
  calculation_type?: TaxCalculationType;
  /** Pourcentage (0–100) ou montant fixe selon `calculation_type`. */
  rate: number;
  currency?: Currency;
  fixed_basis?: TaxFixedBasis;
  applies_to?: TaxAppliesTo;
  is_inclusive?: boolean;
  priority?: number;
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
}

/** La propriété d'un taux de taxe n'est pas modifiable. */
export type UpdateTaxRateDto = Partial<Omit<CreateTaxRateDto, "property_id">>;

/** Nature de la taxe. */
export enum TaxType {
  VAT = "vat",
  TOURIST_TAX = "tourist_tax",
  CITY_TAX = "city_tax",
  SERVICE_CHARGE = "service_charge",
  OTHER = "other",
}

/** Mode de calcul : pourcentage du montant ou montant fixe. */
export enum TaxCalculationType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

/** Assiette d'une taxe fixe (ex. taxe de séjour par personne et par nuit). */
export enum TaxFixedBasis {
  PER_STAY = "per_stay",
  PER_NIGHT = "per_night",
  PER_PERSON = "per_person",
  PER_PERSON_PER_NIGHT = "per_person_per_night",
}

/** Catégorie de prestations soumises à la taxe. */
export enum TaxAppliesTo {
  ALL = "all",
  ROOM = "room",
  FOOD_BEVERAGE = "food_beverage",
  SERVICES = "services",
}

/** Taux de taxe d'un établissement (TVA, taxe de séjour…). - `percentage` : `rate` est un pourcentage (0–100) du montant ; - `fixed` : `rate` est un montant fixe dans `currency`, multiplié selon `fixed_basis` (nuits, personnes). `is_inclusive` indique que la taxe est déjà comprise dans le prix. */
export interface TaxRate extends AuditableEntity {
  property_id: string;
  name: string;
  code: string;
  description?: string;
  tax_type: TaxType;
  calculation_type: TaxCalculationType;
  rate: number;
  currency: Currency;
  fixed_basis: TaxFixedBasis;
  applies_to: TaxAppliesTo;
  is_inclusive: boolean;
  /** Ordre d'affichage sur la facture (croissant). */
  priority: number;
  valid_from?: string;
  valid_to?: string;
  is_active: boolean;
}

export interface TaxLine {
  tax_rate_id: string;
  name: string;
  code: string;
  tax_type: TaxType;
  calculation_type: TaxCalculationType;
  rate: number;
  is_inclusive: boolean;
  amount: number;
}

export interface TaxCalculationResult {
  /** Montant saisi (TTC pour les taxes incluses, HT pour les autres). */
  base_amount: number;
  /** Montant hors toutes taxes. */
  net_amount: number;
  taxes: TaxLine[];
  total_inclusive_tax: number;
  total_exclusive_tax: number;
  total_tax: number;
  /** Montant final à payer = base_amount + taxes non incluses. */
  total_amount: number;
}
