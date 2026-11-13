// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/accountant/
// =============================================================================

import type { User } from "./base-entities";

/** Corps de la route de changement de mot de passe. */
export interface ChangeAccountantPasswordDto {
  current_password: string;
  new_password: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export interface SuspendAccountantDto {
  reason?: string;
}

/** Corps de la route de mise à jour des habilitations financières. */
export interface UpdateAccountantPermissionsDto {
  can_create_invoices?: boolean;
  can_process_refunds?: boolean;
  can_export_reports?: boolean;
  approval_limit?: number;
}

/** Corps des routes d'ajout / retrait de certification. */
export interface AccountantCertificationDto {
  certification: string;
}

/** DTO de création d'un comptable rattaché à une propriété. Le mot de passe est fourni en clair puis hashé par le service. */
export interface CreateAccountantDto {
  email: string;
  password: string;
  property_id: string;
  employee_code: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  language?: string;
  timezone?: string;
  certification?: string;
  certifications?: string[];
  can_create_invoices?: boolean;
  can_process_refunds?: boolean;
  can_export_reports?: boolean;
  /** Montant maximal que le comptable peut approuver seul. */
  approval_limit?: number;
  hire_date?: string;
  preferences?: Record<string, unknown>;
}

/** DTO de mise à jour d'un comptable. Le mot de passe est exclu : il se modifie via `PATCH /accountants/:id/password`. */
export type UpdateAccountantDto = Partial<Omit<CreateAccountantDto, "password">>;

/** Statuts possibles d'un comptable. */
export enum AccountantStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export interface Accountant extends User {
  property_id: string;
  employee_code: string;
  certification?: string;
  can_create_invoices: boolean;
  can_process_refunds: boolean;
  can_export_reports: boolean;
  approval_limit: number;
  status?: AccountantStatus;
  hire_date?: string;
  certifications?: string[];
  preferences?: Record<string, unknown>;
}

/** Résultat d'une vérification de plafond d'approbation. */
export interface ApprovalCheckResult {
  allowed: boolean;
  amount: number;
  approval_limit: number;
  reason?: string;
}
