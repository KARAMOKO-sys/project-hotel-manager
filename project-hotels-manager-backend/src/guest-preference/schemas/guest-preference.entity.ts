import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type GuestPreferenceDocument = HydratedDocument<GuestPreference>;

/**
 * Préférence d'un client (chambre calme, étage élevé, oreiller ferme…).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'guest_preferences',
})
export class GuestPreference extends AuditableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Guest', required: true, index: true })
  guest_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  preference_type!: string;

  @Prop({ type: String, trim: true, maxlength: 500 })
  value?: string;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;
}

export const GuestPreferenceSchema =
  SchemaFactory.createForClass(GuestPreference);

GuestPreferenceSchema.index(
  { guest_id: 1, preference_type: 1 },
  { unique: true },
);
