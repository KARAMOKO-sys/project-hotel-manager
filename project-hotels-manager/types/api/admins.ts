// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/admins/
// =============================================================================

import type { User } from "./base-entities";

/** Corps de la route de changement de mot de passe. */
export interface ChangeAdminPasswordDto {
  current_password: string;
  new_password: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export interface SuspendAdminDto {
  reason?: string;
}

/** Corps de la route de modification du niveau d'accès. */
export interface UpdateAccessLevelDto {
  access_level: number;
}

/** Corps de la route de mise à jour de la liste blanche d'IP. */
export interface UpdateIpWhitelistDto {
  ip_whitelist: string[];
}

/** DTO de création d'un super administrateur. Le mot de passe est fourni en clair puis hashé par le service ; il n'est jamais persisté tel quel. */
export interface CreateAdminDto {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  language?: string;
  timezone?: string;
  employee_id?: string;
  department?: string;
  position?: string;
  /** Niveau d'accès de 1 (restreint) à 5 (accès complet). */
  access_level?: number;
  can_manage_system?: boolean;
  can_manage_users?: boolean;
  can_view_all_orgs?: boolean;
  receive_system_alerts?: boolean;
  alert_email?: string;
  alert_phone?: string;
  /** Montant maximal approuvable (0 = illimité). */
  approval_limit?: number;
  hire_date?: string;
  managed_departments?: string[];
  system_preferences?: Record<string, unknown>;
  ip_whitelist?: string[];
  mfa_required?: boolean;
}

/** DTO de mise à jour d'un super administrateur. Le mot de passe est exclu : il se modifie uniquement via la route dédiée `PATCH /admins/:id/password`. */
export type UpdateAdminDto = Partial<Omit<CreateAdminDto, "password">>;

/** Statuts possibles d'un super administrateur. */
export enum AdminStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export interface SuperAdmin extends User {
  employee_id?: string;
  department?: string;
  position?: string;
  access_level: number;
  can_manage_system: boolean;
  can_manage_users: boolean;
  can_view_all_orgs: boolean;
  receive_system_alerts: boolean;
  alert_email?: string;
  alert_phone?: string;
  approval_limit: number;
  status?: AdminStatus;
  hire_date?: string;
  managed_departments?: string[];
  system_preferences?: Record<string, unknown>;
  ip_whitelist?: string[];
  mfa_required?: boolean;
  last_audit_at?: string;
}
