import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type ContactMessageDocument = HydratedDocument<ContactMessage>;

export enum ContactMessageStatus {
  NEW = 'new',
  READ = 'read',
  ANSWERED = 'answered',
  ARCHIVED = 'archived',
}

/** Message envoyé depuis le formulaire de contact du site public. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'contact_messages',
})
export class ContactMessage extends AuditableEntity {
  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255,
    index: true,
  })
  email!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 200 })
  subject!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 5000 })
  message!: string;

  /** Propriété concernée, si le message est envoyé depuis sa fiche. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ContactMessageStatus),
    default: ContactMessageStatus.NEW,
    index: true,
  })
  status!: ContactMessageStatus;
}

export const ContactMessageSchema =
  SchemaFactory.createForClass(ContactMessage);
