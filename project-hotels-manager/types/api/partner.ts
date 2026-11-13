// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/partner/
// =============================================================================

import type { User } from "./base-entities";

/** Coordonnées bancaires pour le versement des commissions. */
export interface PartnerBankAccountDto {
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  bank_code?: string;
  swift_code?: string;
}

/** DTO d'inscription d'un partenaire (cf. Documents.txt §4.4). Le partenaire est créé « en attente » : son statut, sa commission et sa limite de propriétés sont gérés par les administrateurs via des routes dédiées. */
export interface CreatePartnerDto {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  language?: string;
  company_name: string;
  partner_type: PartnerType;
  company_registration?: string;
  tax_id?: string;
  company_logo_url?: string;
  company_website?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  registration_document_url?: string;
  tax_document_url?: string;
  contract_document_url?: string;
  commission_payment_method?: CommissionPaymentMethod;
  bank_account?: PartnerBankAccountDto;
  certifications?: string[];
  specializations?: string[];
  terms_accepted: boolean;
  data_processing_accepted: boolean;
}

/** Corps de la route de changement de mot de passe. */
export interface ChangePartnerPasswordDto {
  current_password: string;
  new_password: string;
}

/** Corps de la route d'approbation d'un partenaire. */
export interface ApprovePartnerDto {
  /** Identifiant de l'administrateur ayant approuvé le dossier. */
  verified_by?: string;
}

/** Corps des routes nécessitant une raison obligatoire (rejet, blocage). */
export interface PartnerReasonDto {
  reason: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export interface SuspendPartnerDto {
  reason?: string;
}

/** Corps de la route de modification du taux de commission. */
export interface CommissionRateDto {
  commission_rate: number;
}

/** Corps de la route de modification de la limite de propriétés. */
export interface MaxPropertiesDto {
  max_properties: number;
}

/** Corps de la route d'enregistrement d'une réservation apportée. */
export interface RecordPartnerBookingDto {
  amount: number;
}

/** Corps de la route d'association d'une propriété. */
export interface PartnerPropertyDto {
  property_id: string;
}

/** Corps de la route d'ajout d'un avis. */
export interface PartnerReviewDto {
  rating: number;
}

/** DTO de mise à jour d'un partenaire. Exclut le mot de passe (route `PATCH /partners/:id/password`) et les consentements, qui ne sont donnés qu'à l'inscription. */
export type UpdatePartnerDto = Partial<Omit<CreatePartnerDto, "password" | "terms_accepted" | "data_processing_accepted">>;

export enum PartnerType {
  REAL_ESTATE_AGENCY = "real_estate_agency",
  PROPERTY_OWNER = "property_owner",
  PROPERTY_MANAGER = "property_manager",
  DEVELOPER = "developer",
  INVESTMENT_FUND = "investment_fund",
  CONSTRUCTION_COMPANY = "construction_company",
  INTERIOR_DESIGNER = "interior_designer",
}

export enum PartnerStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  BLOCKED = "blocked",
  INACTIVE = "inactive",
  REJECTED = "rejected",
}

/** Modalités de versement des commissions. */
export enum CommissionPaymentMethod {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
  PER_TRANSACTION = "per_transaction",
}

export interface Partner extends User {
  company_name: string;
  partner_type: PartnerType;
  partner_status: PartnerStatus;
  commission_rate: number;
  max_properties: number;
  company_registration?: string;
  tax_id?: string;
  company_logo_url?: string;
  company_website?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  registration_document_url?: string;
  tax_document_url?: string;
  contract_document_url?: string;
  contract_signed_at?: string;
  commission_payment_method?: CommissionPaymentMethod;
  max_listings_per_month?: number;
  bank_account?: { account_name?: string; account_number?: string; bank_name?: string; bank_code?: string; swift_code?: string };
  certifications?: string[];
  specializations?: string[];
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  total_properties_listed?: number;
  total_bookings?: number;
  total_commission_earned?: number;
  rating?: number;
  total_reviews?: number;
  property_ids?: string[];
}

/** Résultat d'un calcul de commission. */
export interface CommissionResult {
  amount: number;
  commission_rate: number;
  commission: number;
}

/** Statistiques globales des partenaires. */
export interface PartnerStatistics {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  total_properties_listed: number;
  total_commission_earned: number;
  avg_commission_rate: number;
}
