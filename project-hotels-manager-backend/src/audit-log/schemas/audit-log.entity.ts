import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type AuditLogDocument = HydratedDocument<AuditLog>;

/**
 * Actions d'audit courantes. Le champ `action` reste libre afin de permettre
 * des actions métier spécifiques (ex : `reservation.cancel`).
 */
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',
  STATUS_CHANGE = 'status_change',
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGE = 'password_change',
  PERMISSION_CHANGE = 'permission_change',
  EXPORT = 'export',
}

/** Différence sur un champ entre l'état avant et après. */
@Schema({ _id: false, timestamps: false })
export class AuditChange {
  @Prop({ type: String, required: true })
  field!: string;

  @Prop({ type: Object })
  old_value?: unknown;

  @Prop({ type: Object })
  new_value?: unknown;
}

export const AuditChangeSchema = SchemaFactory.createForClass(AuditChange);

/**
 * Entrée du journal d'audit (append-only) : qui a fait quoi, sur quelle
 * entité, avec l'état avant/après et le contexte de la requête.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'audit_logs',
})
export class AuditLog extends AuditableEntity {
  /** Auteur de l'action (absent pour une action système). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  actor_id?: Types.ObjectId;

  /** Type d'auteur : super_admin, owner, guest, partner, system… */
  @Prop({ type: String, trim: true, maxlength: 50, default: 'system' })
  actor_type!: string;

  @Prop({ type: String, trim: true, lowercase: true, maxlength: 320 })
  actor_email?: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
    index: true,
  })
  action!: string;

  /** Type d'entité concernée (ex : Reservation, Invoice). */
  @Prop({ type: String, trim: true, maxlength: 100 })
  entity_type?: string;

  /** Identifiant de l'entité concernée (chaîne pour rester générique). */
  @Prop({ type: String, trim: true, maxlength: 100 })
  entity_id?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: Object })
  old_values?: Record<string, any>;

  @Prop({ type: Object })
  new_values?: Record<string, any>;

  @Prop({ type: [AuditChangeSchema], default: [] })
  changes!: AuditChange[];

  @Prop({ type: String, trim: true, maxlength: 64 })
  ip_address?: string;

  @Prop({ type: String, maxlength: 1000 })
  user_agent?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  request_id?: string;

  @Prop({ type: String, maxlength: 1000 })
  description?: string;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });
AuditLogSchema.index({ actor_id: 1, created_at: -1 });
AuditLogSchema.index({ created_at: -1 });
AuditLogSchema.index({ property_id: 1, created_at: -1 });

/**
 * Journal append-only : toute tentative de modification au niveau base est
 * refusée. Les suppressions (purge de rétention) restent possibles.
 */
AuditLogSchema.pre(
  [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
    'findOneAndReplace',
  ],
  function () {
    throw new Error('Le journal d’audit est en écriture seule (append-only)');
  },
);
