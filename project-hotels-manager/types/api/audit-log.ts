// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/audit-log/
// =============================================================================

import type { AuditableEntity } from "./base-entities";
import type { PaginationQueryDto } from "./common";

export interface AuditLogQueryDto extends PaginationQueryDto {
  action?: string;
  entity_type?: string;
  actor_id?: string;
  property_id?: string;
  from?: string;
  to?: string;
}

/** Période obligatoire pour la recherche par plage de dates. */
export interface AuditDateRangeQueryDto extends PaginationQueryDto {
  from: string;
  to: string;
}

export interface AuditChangeDto {
  field: string;
  old_value?: unknown;
  new_value?: unknown;
}

export interface CreateAuditLogDto {
  actor_id?: string;
  actor_type?: string;
  actor_email?: string;
  /** Voir `AuditAction` pour les valeurs courantes. */
  action: string;
  entity_type?: string;
  entity_id?: string;
  property_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  /** Calculé automatiquement à partir de old/new_values si absent. */
  changes?: AuditChangeDto[];
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/** Le journal d'audit est en écriture seule : aucune mise à jour n'est autorisée. Ce DTO vide n'existe que pour typer `BaseCrudService`. */
export type UpdateAuditLogDto = Record<string, never>;

/** Actions d'audit courantes. Le champ `action` reste libre afin de permettre des actions métier spécifiques (ex : `reservation.cancel`). */
export enum AuditAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  RESTORE = "restore",
  STATUS_CHANGE = "status_change",
  LOGIN = "login",
  LOGOUT = "logout",
  LOGIN_FAILED = "login_failed",
  PASSWORD_CHANGE = "password_change",
  PERMISSION_CHANGE = "permission_change",
  EXPORT = "export",
}

/** Différence sur un champ entre l'état avant et après. */
export interface AuditChange {
  field: string;
  old_value?: unknown;
  new_value?: unknown;
}

/** Entrée du journal d'audit (append-only) : qui a fait quoi, sur quelle entité, avec l'état avant/après et le contexte de la requête. */
export interface AuditLog extends AuditableEntity {
  /** Auteur de l'action (absent pour une action système). */
  actor_id?: string;
  /** Type d'auteur : super_admin, owner, guest, partner, system… */
  actor_type: string;
  actor_email?: string;
  action: string;
  /** Type d'entité concernée (ex : Reservation, Invoice). */
  entity_type?: string;
  /** Identifiant de l'entité concernée (chaîne pour rester générique). */
  entity_id?: string;
  property_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changes: AuditChange[];
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  description?: string;
  metadata: Record<string, unknown>;
}
