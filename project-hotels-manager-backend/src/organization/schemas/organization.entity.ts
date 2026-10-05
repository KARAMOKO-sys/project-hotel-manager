import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  AddressEmbeddable,
  AddressSchema,
} from '../../base-entities/embeddables/address.embeddable';
import {
  ContactEmbeddable,
  ContactSchema,
} from '../../base-entities/embeddables/contact.embeddable';

export type OrganizationDocument = HydratedDocument<Organization>;

/** Type d'organisation (chaîne hôtelière, groupe, établissement indépendant). */
export enum OrganizationType {
  CHAIN = 'chain',
  GROUP = 'group',
  INDEPENDENT = 'independent',
}

/** Statut métier d'une organisation. */
export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/** Membre de l'organisation (sous-document embarqué). */
@Schema({ _id: false, timestamps: false })
export class OrganizationMember {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, ref: 'Role' })
  role_id?: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  joined_at!: Date;
}

export const OrganizationMemberSchema =
  SchemaFactory.createForClass(OrganizationMember);

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'organizations',
})
export class Organization extends AuditableEntity {
  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
    index: true,
  })
  name!: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 50,
  })
  code!: string;

  @Prop({
    type: String,
    enum: Object.values(OrganizationType),
    default: OrganizationType.INDEPENDENT,
  })
  type!: OrganizationType;

  @Prop({ type: String, maxlength: 500 })
  description?: string;

  @Prop({ type: AddressSchema, default: {} })
  address?: AddressEmbeddable;

  @Prop({ type: ContactSchema, default: {} })
  contact?: ContactEmbeddable;

  @Prop({ type: String })
  logo_url?: string;

  @Prop({ type: String })
  website?: string;

  @Prop({
    type: Object,
    default: () => ({}),
  })
  settings!: Record<string, any>;

  @Prop({
    type: String,
    enum: Object.values(OrganizationStatus),
    default: OrganizationStatus.ACTIVE,
  })
  status!: OrganizationStatus;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;

  @Prop({ type: [OrganizationMemberSchema], default: () => [] })
  members!: OrganizationMember[];
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ status: 1 });
OrganizationSchema.index({ type: 1 });
