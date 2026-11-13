import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';

export type TaxRateDocument = HydratedDocument<TaxRate>;

/** Nature de la taxe. */
export enum TaxType {
  VAT = 'vat',
  TOURIST_TAX = 'tourist_tax',
  CITY_TAX = 'city_tax',
  SERVICE_CHARGE = 'service_charge',
  OTHER = 'other',
}

/** Mode de calcul : pourcentage du montant ou montant fixe. */
export enum TaxCalculationType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

/** Assiette d'une taxe fixe (ex. taxe de séjour par personne et par nuit). */
export enum TaxFixedBasis {
  PER_STAY = 'per_stay',
  PER_NIGHT = 'per_night',
  PER_PERSON = 'per_person',
  PER_PERSON_PER_NIGHT = 'per_person_per_night',
}

/** Catégorie de prestations soumises à la taxe. */
export enum TaxAppliesTo {
  ALL = 'all',
  ROOM = 'room',
  FOOD_BEVERAGE = 'food_beverage',
  SERVICES = 'services',
}

/**
 * Taux de taxe d'un établissement (TVA, taxe de séjour…).
 *
 * - `percentage` : `rate` est un pourcentage (0–100) du montant ;
 * - `fixed` : `rate` est un montant fixe dans `currency`, multiplié selon
 *   `fixed_basis` (nuits, personnes).
 * `is_inclusive` indique que la taxe est déjà comprise dans le prix.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'tax_rates',
})
export class TaxRate extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 30,
  })
  code!: string;

  @Prop({ type: String, maxlength: 500 })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(TaxType),
    default: TaxType.VAT,
    index: true,
  })
  tax_type!: TaxType;

  @Prop({
    type: String,
    enum: Object.values(TaxCalculationType),
    default: TaxCalculationType.PERCENTAGE,
  })
  calculation_type!: TaxCalculationType;

  @Prop({ type: Number, required: true, min: 0 })
  rate!: number;

  @Prop({
    type: String,
    enum: Object.values(Currency),
    default: Currency.XOF,
  })
  currency!: Currency;

  @Prop({
    type: String,
    enum: Object.values(TaxFixedBasis),
    default: TaxFixedBasis.PER_STAY,
  })
  fixed_basis!: TaxFixedBasis;

  @Prop({
    type: String,
    enum: Object.values(TaxAppliesTo),
    default: TaxAppliesTo.ALL,
  })
  applies_to!: TaxAppliesTo;

  @Prop({ type: Boolean, default: false })
  is_inclusive!: boolean;

  /** Ordre d'affichage sur la facture (croissant). */
  @Prop({ type: Number, default: 0 })
  priority!: number;

  @Prop({ type: Date })
  valid_from?: Date;

  @Prop({ type: Date })
  valid_to?: Date;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;
}

export const TaxRateSchema = SchemaFactory.createForClass(TaxRate);

TaxRateSchema.index({ property_id: 1, code: 1 }, { unique: true });
TaxRateSchema.index({ property_id: 1, is_active: 1, applies_to: 1 });
