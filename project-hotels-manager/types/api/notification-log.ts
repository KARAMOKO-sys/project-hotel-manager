// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/notification-log/
// =============================================================================

import type { AuditableEntity, NotificationChannel } from "./base-entities";
import type { PaginationQueryDto } from "./common";

export interface CreateNotificationLogDto {
  property_id?: string;
  recipient_id?: string;
  recipient_type?: NotificationRecipientType;
  recipient_address?: string;
  channel: NotificationChannel;
  template?: string;
  subject?: string;
  body?: string;
  provider?: string;
  max_retries?: number;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, unknown>;
}

export interface MarkAsSentDto {
  provider_message_id?: string;
  provider?: string;
}

export interface MarkAsFailedDto {
  error_message: string;
}

export interface NotificationLogQueryDto extends PaginationQueryDto {
  property_id?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  template?: string;
}

export interface NotificationStatsQueryDto {
  property_id?: string;
  from?: string;
  to?: string;
}

/** Le statut n'est pas modifiable par la mise à jour générique : utiliser les routes de transition (sent, delivered, read, failed, retry). */
export type UpdateNotificationLogDto = Partial<Pick<CreateNotificationLogDto, "subject" | "body" | "provider" | "max_retries" | "metadata">>;

/** Statut d'acheminement d'une notification. */
export enum NotificationStatus {
  QUEUED = "queued",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

/** Type de destinataire. */
export enum NotificationRecipientType {
  USER = "user",
  GUEST = "guest",
  PARTNER = "partner",
  OTHER = "other",
}

/** Journal d'une notification envoyée (email, SMS, push, in-app) avec suivi du statut d'acheminement et des tentatives de renvoi. */
export interface NotificationLog extends AuditableEntity {
  property_id?: string;
  /** Identifiant du destinataire (utilisateur, client…). */
  recipient_id?: string;
  recipient_type: NotificationRecipientType;
  /** Adresse technique : email, numéro de téléphone, jeton push… */
  recipient_address?: string;
  channel: NotificationChannel;
  /** Modèle utilisé (ex : reservation_confirmation). */
  template?: string;
  subject?: string;
  body?: string;
  status: NotificationStatus;
  /** Fournisseur d'envoi (sendgrid, twilio, fcm…). */
  provider?: string;
  provider_message_id?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  /** Entité métier liée (ex : Reservation). */
  related_entity_type?: string;
  related_entity_id?: string;
  metadata: Record<string, unknown>;
}

/** Statistiques d'envoi des notifications. */
export interface NotificationStats {
  total: number;
  by_status: Record<string, number>;
  by_channel: Record<string, Record<string, number>>;
  delivery_rate: number;
  failure_rate: number;
}
