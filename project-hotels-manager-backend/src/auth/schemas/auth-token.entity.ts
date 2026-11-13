import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { UserType } from '../../base-entities/enums/user-type.enum';

export type AuthTokenDocument = HydratedDocument<AuthToken>;

/** Usage d'un jeton à usage unique. */
export enum AuthTokenType {
  PASSWORD_RESET = 'password_reset',
  MAGIC_LINK = 'magic_link',
  EMAIL_VERIFICATION = 'email_verification',
}

/**
 * Jeton à usage unique envoyé par email (réinitialisation de mot de passe,
 * lien magique, vérification d'email).
 *
 * Seule l'empreinte SHA-256 du jeton est stockée. Un jeton est valide tant
 * que `used_at` est vide et que `expires_at` n'est pas dépassé. Les jetons
 * sont supprimés automatiquement par MongoDB un jour après expiration.
 */
@Schema({
  collection: 'auth_tokens',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class AuthToken {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  user_id!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(UserType), required: true })
  user_type!: UserType;

  @Prop({ type: String, enum: Object.values(AuthTokenType), required: true })
  type!: AuthTokenType;

  @Prop({ type: String, required: true, unique: true, select: false })
  token_hash!: string;

  @Prop({ type: Date, required: true })
  expires_at!: Date;

  @Prop({ type: Date, required: false, default: null })
  used_at?: Date | null;

  @Prop({ type: String, required: false, maxlength: 45 })
  requested_ip?: string;

  @Prop({ type: String, required: false, maxlength: 500 })
  user_agent?: string;

  created_at?: Date;
  updated_at?: Date;
}

export const AuthTokenSchema = SchemaFactory.createForClass(AuthToken);

AuthTokenSchema.index({ user_id: 1, user_type: 1, type: 1, used_at: 1 });
AuthTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 86400 });
