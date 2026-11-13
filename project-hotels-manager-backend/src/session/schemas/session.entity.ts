import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { UserType } from '../../base-entities/enums/user-type.enum';

export type SessionDocument = HydratedDocument<Session>;

/** Raisons possibles de révocation d'une session. */
export enum SessionRevokeReason {
  LOGOUT = 'logout',
  LOGOUT_ALL = 'logout_all',
  ROTATED = 'rotated',
  TOKEN_REUSE = 'token_reuse',
  PASSWORD_CHANGED = 'password_changed',
  ADMIN = 'admin',
}

/**
 * Session d'authentification.
 *
 * Une session correspond à un refresh token émis pour un appareil/navigateur.
 * Le refresh token n'est jamais stocké en clair : seule son empreinte
 * (`refresh_token_hash`) est conservée et elle n'est pas sélectionnée par défaut.
 *
 * Les utilisateurs étant répartis dans plusieurs collections (guests, owners,
 * super_admins…), la paire (`user_id`, `user_type`) identifie le titulaire.
 */
@Schema({
  collection: 'sessions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Session {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  user_id!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(UserType),
    required: true,
    index: true,
  })
  user_type!: UserType;

  @Prop({ type: String, required: true, select: false })
  refresh_token_hash!: string;

  @Prop({ type: String, required: false, maxlength: 500 })
  user_agent?: string;

  @Prop({ type: String, required: false, maxlength: 45 })
  ip?: string;

  @Prop({ type: Date, required: true })
  expires_at!: Date;

  @Prop({ type: Date, required: false, default: null })
  revoked_at?: Date | null;

  @Prop({
    type: String,
    enum: Object.values(SessionRevokeReason),
    required: false,
  })
  revoked_reason?: SessionRevokeReason;

  /** Session ayant remplacé celle-ci lors d'une rotation du refresh token. */
  @Prop({ type: SchemaTypes.ObjectId, required: false })
  replaced_by?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  last_used_at?: Date;

  created_at?: Date;
  updated_at?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ user_id: 1, user_type: 1, revoked_at: 1 });
// Suppression automatique par MongoDB une fois la session expirée.
SessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
