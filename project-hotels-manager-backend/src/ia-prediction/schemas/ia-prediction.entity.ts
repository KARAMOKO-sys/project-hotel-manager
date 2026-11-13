import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type IaPredictionDocument = HydratedDocument<IaPrediction>;

/** Grandeur prédite. */
export enum PredictionType {
  DEMAND = 'demand',
  OCCUPANCY = 'occupancy',
  PRICE = 'price',
  REVENUE = 'revenue',
  CHURN = 'churn',
  MAINTENANCE = 'maintenance',
}

/** Méthode de prévision utilisée. */
export enum ForecastMethod {
  MOVING_AVERAGE = 'moving_average',
  LINEAR_TREND = 'linear_trend',
  /** Tendance linéaire + saisonnalité hebdomadaire additive. */
  SEASONAL_TREND = 'seasonal_trend',
  /** Valeur saisie manuellement ou produite par un système externe. */
  MANUAL = 'manual',
}

export enum PredictionStatus {
  /** En attente de la valeur réelle. */
  PENDING = 'pending',
  /** Valeur réelle enregistrée, erreur calculée. */
  EVALUATED = 'evaluated',
}

/**
 * Prédiction produite par le moteur de prévision (ou importée), conservée
 * pour suivre sa précision une fois la valeur réelle connue.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'ia_predictions',
})
export class IaPrediction extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(PredictionType),
    required: true,
    index: true,
  })
  type!: PredictionType;

  /** Cible lisible : `property`, `room_type`, `guest`, `equipment`… */
  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  target!: string;

  /** Identifiant de la cible (type de chambre, client, équipement…). */
  @Prop({ type: SchemaTypes.ObjectId, index: true })
  target_id?: Types.ObjectId;

  /** Date concernée par la prédiction. */
  @Prop({ type: Date, required: true, index: true })
  target_date!: Date;

  /** Horizon en jours entre la génération et la date cible. */
  @Prop({ type: Number, min: 0, required: true })
  horizon_days!: number;

  @Prop({ type: Number, required: true })
  predicted_value!: number;

  @Prop({ type: Number })
  lower_bound?: number;

  @Prop({ type: Number })
  upper_bound?: number;

  @Prop({ type: Number, min: 0, max: 1, default: 0.5 })
  confidence!: number;

  @Prop({
    type: String,
    enum: Object.values(ForecastMethod),
    default: ForecastMethod.MANUAL,
  })
  method!: ForecastMethod;

  @Prop({ type: String, default: 'heuristic-v1', trim: true, maxlength: 50 })
  model_version!: string;

  /** Résumé des données d'entrée (taille de l'historique, pente…). */
  @Prop({ type: Object, default: () => ({}) })
  input_summary!: Record<string, any>;

  @Prop({
    type: String,
    enum: Object.values(PredictionStatus),
    default: PredictionStatus.PENDING,
    index: true,
  })
  status!: PredictionStatus;

  @Prop({ type: Number })
  actual_value?: number;

  @Prop({ type: Date })
  actual_recorded_at?: Date;

  @Prop({ type: Number, min: 0 })
  absolute_error?: number;

  /** Erreur relative en % (absente si la valeur réelle vaut 0). */
  @Prop({ type: Number, min: 0 })
  percentage_error?: number;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const IaPredictionSchema = SchemaFactory.createForClass(IaPrediction);

IaPredictionSchema.index({ property_id: 1, type: 1, target_date: 1 });
IaPredictionSchema.index({ status: 1, target_date: 1 });
IaPredictionSchema.index({ model_version: 1, type: 1 });
