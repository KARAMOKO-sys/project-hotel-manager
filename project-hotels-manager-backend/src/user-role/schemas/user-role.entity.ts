import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { UserType } from '../../base-entities/enums/user-type.enum';
import { Role } from '../../role/schemas/role.schema';

export type UserRoleDocument = HydratedDocument<UserRole>;

/**
 * Assignation d'un rôle à un utilisateur.
 *
 * Un utilisateur peut cumuler plusieurs rôles (ex. client + propriétaire),
 * éventuellement limités à un établissement (`property_id`) et/ou dans le
 * temps (`expires_at`). Les utilisateurs étant répartis dans plusieurs
 * collections, la paire (`user_id`, `user_type`) identifie le titulaire.
 */
@Schema({
  collection: 'user_roles',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class UserRole {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  user_id!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(UserType),
    required: true,
  })
  user_type!: UserType;

  @Prop({ type: SchemaTypes.ObjectId, ref: Role.name, required: true, index: true })
  role_id!: Types.ObjectId;

  /** Établissement auquel le rôle est limité (absent = rôle global). */
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: false,
    default: null,
  })
  property_id?: Types.ObjectId | null;

  @Prop({ type: Date, required: false, default: null })
  expires_at?: Date | null;

  @Prop({ type: SchemaTypes.ObjectId, required: false })
  assigned_by?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(UserType),
    required: false,
  })
  assigned_by_type?: UserType;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;

  created_at?: Date;
  updated_at?: Date;
}

export const UserRoleSchema = SchemaFactory.createForClass(UserRole);

UserRoleSchema.index(
  { user_id: 1, user_type: 1, role_id: 1, property_id: 1 },
  { unique: true },
);
UserRoleSchema.index({ user_id: 1, user_type: 1, is_active: 1 });
