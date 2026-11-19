import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type RecordActivityDocument = HydratedDocument<RecordActivity>;

/** Type d'activité planifiée. */
export enum RecordActivityType {
  TODO = 'todo',
  CALL = 'call',
  MEETING = 'meeting',
  EMAIL = 'email',
  FOLLOW_UP = 'follow_up',
}

/** État d'une activité. */
export enum RecordActivityState {
  PLANNED = 'planned',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

/** Activité planifiée sur une fiche (à faire, appel, réunion…). */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'record_activities',
})
export class RecordActivity extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 100 })
  res_model!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  res_id!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(RecordActivityType),
    required: true,
    default: RecordActivityType.TODO,
  })
  activity_type!: RecordActivityType;

  @Prop({ type: String, required: true, trim: true, maxlength: 255 })
  summary!: string;

  @Prop({ type: String, maxlength: 10000 })
  note?: string;

  @Prop({ type: Date, required: true, index: true })
  due_date!: Date;

  @Prop({ type: SchemaTypes.ObjectId, index: true })
  assigned_to?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(RecordActivityState),
    required: true,
    default: RecordActivityState.PLANNED,
    index: true,
  })
  state!: RecordActivityState;

  @Prop({ type: Date })
  done_at?: Date;

  @Prop({ type: SchemaTypes.ObjectId })
  done_by?: Types.ObjectId;

  @Prop({ type: String, maxlength: 10000 })
  feedback?: string;

  @Prop({ type: SchemaTypes.ObjectId })
  created_by?: Types.ObjectId;

  /** Règle d'automatisation à l'origine de l'activité, le cas échéant. */
  @Prop({ type: SchemaTypes.ObjectId })
  created_by_rule_id?: Types.ObjectId;

  /** Vrai une fois l'événement `platform.activity.due` publié. */
  @Prop({ type: Boolean, default: false })
  due_notified!: boolean;
}

export const RecordActivitySchema =
  SchemaFactory.createForClass(RecordActivity);
RecordActivitySchema.index({ res_model: 1, res_id: 1, state: 1 });
RecordActivitySchema.index({ assigned_to: 1, state: 1, due_date: 1 });
RecordActivitySchema.index({ state: 1, due_notified: 1, due_date: 1 });
