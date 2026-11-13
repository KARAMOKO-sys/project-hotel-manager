// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/owners/
// =============================================================================

import type { User } from "./base-entities";

/** Coordonnées GPS de l'adresse du propriétaire. */
export interface OwnerCoordinatesDto {
  latitude: number;
  longitude: number;
}

/** Détails d'adresse complémentaires. */
export interface OwnerAddressDetailsDto {
  street?: string;
  district?: string;
  landmark?: string;
  coordinates?: OwnerCoordinatesDto;
}

/** DTO de création d'un propriétaire. Le statut (`owner_status`), la vérification et les compteurs sont gérés par le service ; le mot de passe est hashé avant enregistrement. */
export interface CreateOwnerDto {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  language?: string;
  timezone?: string;
  company_name?: string;
  company_registration?: string;
  tax_id?: string;
  birth_date?: string;
  nationality?: string;
  id_type?: IdentificationType;
  id_number?: string;
  id_document_url?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  address_details?: OwnerAddressDetailsDto;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  contract_document_url?: string;
  contract_signed_at?: string;
  business_license_url?: string;
  insurance_document_url?: string;
  certifications?: string[];
  /** Plan d'abonnement initial (par défaut : basique). */
  subscription_plan?: OwnerSubscriptionPlan;
  preferences?: Record<string, unknown>;
}

/** Corps de la route de changement de mot de passe. */
export interface ChangeOwnerPasswordDto {
  current_password: string;
  new_password: string;
}

/** Corps de la route de validation d'un propriétaire. */
export interface VerifyOwnerDto {
  /** Identifiant de l'administrateur ayant validé le dossier. */
  verified_by?: string;
}

/** Corps de la route de rejet d'un dossier propriétaire. */
export interface RejectOwnerDto {
  reason: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export interface SuspendOwnerDto {
  reason?: string;
}

/** Corps de la route d'association d'une propriété. */
export interface OwnerPropertyDto {
  property_id: string;
}

/** Corps de la route de changement d'abonnement. */
export interface UpdateOwnerSubscriptionDto {
  subscription_plan: OwnerSubscriptionPlan;
  subscription_expires_at?: string;
  /** Surcharge du nombre maximal de propriétés (sinon : limite du plan). */
  max_properties?: number;
}

/** Corps de la route d'ajout de chiffre d'affaires. */
export interface AddOwnerRevenueDto {
  amount: number;
}

/** DTO de mise à jour d'un propriétaire. Exclut le mot de passe (route `PATCH /owners/:id/password`) et le plan d'abonnement (route `PATCH /owners/:id/subscription`). */
export type UpdateOwnerDto = Partial<Omit<CreateOwnerDto, "password" | "subscription_plan">>;

export enum OwnerSubscriptionPlan {
  BASIC = "basic",
  PREMIUM = "premium",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
  TRIAL = "trial",
}

export enum OwnerStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING_VERIFICATION = "pending_verification",
}

export enum IdentificationType {
  PASSPORT = "passport",
  NATIONAL_ID = "national_id",
  DRIVER_LICENSE = "driver_license",
  COMPANY_REGISTRATION = "company_registration",
}

export interface Owner extends User {
  company_name?: string;
  company_registration?: string;
  tax_id?: string;
  birth_date?: string;
  nationality?: string;
  id_type?: IdentificationType;
  id_number?: string;
  id_document_url?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  contract_signed_at?: string;
  contract_document_url?: string;
  max_properties: number;
  subscription_plan: OwnerSubscriptionPlan;
  subscription_expires_at?: string;
  owner_status?: OwnerStatus;
  business_license_url?: string;
  insurance_document_url?: string;
  certifications?: string[];
  address_details?: { street?: string; district?: string; landmark?: string; coordinates?: { latitude?: number; longitude?: number } };
  preferences?: { notifications?: boolean; newsletter?: boolean; language?: string; timezone?: string; theme?: string; dashboard_layout?: string };
  total_properties_created?: number;
  total_rooms_managed?: number;
  total_employees?: number;
  total_revenue?: number;
  last_activity_date?: string;
  is_verified?: boolean;
  verified_at?: string;
  verified_by?: string;
  property_ids?: string[];
}

/** Synthèse de l'abonnement d'un propriétaire. */
export interface OwnerSubscriptionStatus {
  subscription_plan: OwnerSubscriptionPlan;
  subscription_expires_at: null | string;
  is_valid: boolean;
  days_remaining: null | number;
  max_properties: number;
  properties_used: number;
  remaining_slots: number;
  can_add_property: boolean;
}

/** Complétude du dossier d'un propriétaire (aide à la validation). */
export interface OwnerProfileCompleteness {
  is_complete: boolean;
  missing_fields: string[];
  has_required_documents: boolean;
  missing_documents: string[];
}
