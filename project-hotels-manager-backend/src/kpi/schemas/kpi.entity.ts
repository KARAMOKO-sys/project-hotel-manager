import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';

export type KpiDocument = HydratedDocument<Kpi>;

/** Granularité de la période couverte par un instantané de KPI. */
export enum KpiPeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

/** Indicateurs calculés pouvant être suivis en tendance / comparaison. */
export enum KpiMetric {
  OCCUPANCY_RATE = 'occupancy_rate',
  ADR = 'adr',
  REVPAR = 'revpar',
  TREVPAR = 'trevpar',
  GOPPAR = 'goppar',
  ROOM_REVENUE = 'room_revenue',
  TOTAL_REVENUE = 'total_revenue',
  CANCELLATION_RATE = 'cancellation_rate',
  AVERAGE_LENGTH_OF_STAY = 'average_length_of_stay',
  ROOMS_SOLD = 'rooms_sold',
}

/**
 * Instantané des indicateurs de performance d'une propriété sur une période.
 *
 * Les données brutes (chambres disponibles/vendues, revenus…) sont fournies
 * par l'appelant ; les indicateurs sont calculés par `KpiCalculator`.
 * Les taux sont exprimés en pourcentage (0-100), les montants dans `currency`.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'kpis',
})
export class Kpi extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(KpiPeriodType),
    required: true,
    index: true,
  })
  period_type!: KpiPeriodType;

  @Prop({ type: Date, required: true })
  period_start!: Date;

  @Prop({ type: Date, required: true })
  period_end!: Date;

  @Prop({
    type: String,
    enum: Object.values(Currency),
    default: Currency.XOF,
  })
  currency!: Currency;

  // ----- Données brutes -----

  /** Nuitées-chambres disponibles sur la période (chambres × nuits). */
  @Prop({ type: Number, min: 0, required: true })
  rooms_available!: number;

  /** Nuitées-chambres vendues sur la période. */
  @Prop({ type: Number, min: 0, required: true })
  rooms_sold!: number;

  /** Chiffre d'affaires hébergement. */
  @Prop({ type: Number, min: 0, required: true })
  room_revenue!: number;

  /** Chiffre d'affaires total (hébergement + F&B + services). */
  @Prop({ type: Number, min: 0, default: 0 })
  total_revenue!: number;

  /** Résultat brut d'exploitation (peut être négatif). */
  @Prop({ type: Number })
  gross_operating_profit?: number;

  @Prop({ type: Number, min: 0, default: 0 })
  reservations_count!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  cancellations_count!: number;

  /** Nombre de séjours terminés (pour la durée moyenne de séjour). */
  @Prop({ type: Number, min: 0, default: 0 })
  stays_count!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  guests_count!: number;

  // ----- Indicateurs calculés -----

  /** Taux d'occupation (%) = chambres vendues / disponibles. */
  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  occupancy_rate!: number;

  /** Prix moyen par chambre vendue = CA hébergement / chambres vendues. */
  @Prop({ type: Number, min: 0, default: 0 })
  adr!: number;

  /** Revenu par chambre disponible = CA hébergement / chambres disponibles. */
  @Prop({ type: Number, min: 0, default: 0 })
  revpar!: number;

  /** Revenu total par chambre disponible. */
  @Prop({ type: Number, min: 0, default: 0 })
  trevpar!: number;

  /** Résultat brut d'exploitation par chambre disponible. */
  @Prop({ type: Number })
  goppar?: number;

  /** Taux d'annulation (%) = annulations / réservations. */
  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  cancellation_rate!: number;

  /** Durée moyenne de séjour (nuits) = chambres vendues / séjours. */
  @Prop({ type: Number, min: 0, default: 0 })
  average_length_of_stay!: number;

  @Prop({ type: Date, default: Date.now })
  computed_at!: Date;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const KpiSchema = SchemaFactory.createForClass(Kpi);

KpiSchema.index(
  { property_id: 1, period_type: 1, period_start: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } },
);
KpiSchema.index({ property_id: 1, period_start: -1 });
