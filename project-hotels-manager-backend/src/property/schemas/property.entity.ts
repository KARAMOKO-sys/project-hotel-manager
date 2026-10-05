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
import { PropertyType } from '../../base-entities/enums/property-type.enum';

export type PropertyDocument = HydratedDocument<Property>;

export enum PropertyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  RENOVATION = 'renovation',
  SUSPENDED = 'suspended',
}

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'properties',
})
export class Property extends AuditableEntity {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organization_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  owner_id?: Types.ObjectId;

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
    trim: true,
    uppercase: true,
    maxlength: 50,
  })
  code!: string;

  @Prop({
    type: String,
    enum: Object.values(PropertyType),
    default: PropertyType.HOTEL,
  })
  type!: PropertyType;

  @Prop({ type: String, maxlength: 500 })
  description?: string;

  @Prop({ type: Number, min: 1, max: 5, default: 3 })
  star_rating?: number;

  @Prop({ type: AddressSchema, default: {} })
  address?: AddressEmbeddable;

  @Prop({ type: ContactSchema, default: {} })
  contact?: ContactEmbeddable;

  @Prop({ type: [String], default: () => [] })
  amenities!: string[];

  @Prop({ type: [String], default: () => [] })
  images!: string[];

  @Prop({ type: String })
  check_in_time?: string;

  @Prop({ type: String })
  check_out_time?: string;

  @Prop({ type: Object, default: () => ({}) })
  settings!: Record<string, any>;

  @Prop({
    type: String,
    enum: Object.values(PropertyStatus),
    default: PropertyStatus.ACTIVE,
  })
  status!: PropertyStatus;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;
}

export const PropertySchema = SchemaFactory.createForClass(Property);

PropertySchema.index({ organization_id: 1, status: 1 });
PropertySchema.index({ type: 1 });
PropertySchema.index({ name: 1 });
PropertySchema.index({ 'address.city': 1 });
