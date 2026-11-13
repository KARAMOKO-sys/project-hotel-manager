import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  MoneyEmbeddable,
  MoneySchema,
} from '../../base-entities/embeddables/money.embeddable';

export type DailyPriceDocument = HydratedDocument<DailyPrice>;

/** Origine d'un prix journalier. */
export enum DailyPriceSource {
  MANUAL = 'manual',
  BULK = 'bulk',
  DYNAMIC = 'dynamic',
  OTA = 'ota',
}

/**
 * Prix d'un type de chambre pour une nuit donnée (calendrier tarifaire).
 *
 * `date` est normalisée à minuit UTC. Un prix peut être propre à un plan
 * tarifaire (`rate_plan_id`) ou générique (`rate_plan_id` nul).
 * `is_closed` ferme la vente pour cette nuit (stop sell).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'daily_prices',
})
export class DailyPrice extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'RoomType', required: true, index: true })
  room_type_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'RatePlan', default: null })
  rate_plan_id?: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({ type: MoneySchema, required: true })
  price!: MoneyEmbeddable;

  /** Durée minimale de séjour pour une arrivée ce jour-là. */
  @Prop({ type: Number, min: 1 })
  min_stay?: number;

  @Prop({ type: Boolean, default: false })
  is_closed!: boolean;

  @Prop({
    type: String,
    enum: Object.values(DailyPriceSource),
    default: DailyPriceSource.MANUAL,
  })
  source!: DailyPriceSource;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;
}

export const DailyPriceSchema = SchemaFactory.createForClass(DailyPrice);

DailyPriceSchema.index(
  { room_type_id: 1, rate_plan_id: 1, date: 1 },
  { unique: true },
);
DailyPriceSchema.index({ property_id: 1, date: 1 });
