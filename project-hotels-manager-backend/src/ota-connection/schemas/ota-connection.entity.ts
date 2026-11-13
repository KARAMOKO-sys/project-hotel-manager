import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type OtaConnectionDocument = HydratedDocument<OtaConnection>;

/** Agences de voyage en ligne (OTA) supportées. */
export enum OtaProvider {
  BOOKING = 'booking',
  EXPEDIA = 'expedia',
  AIRBNB = 'airbnb',
  AGODA = 'agoda',
}

/** État de la connexion à l'OTA. */
export enum OtaConnectionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  DISABLED = 'disabled',
  ERROR = 'error',
}

/** État de la dernière synchronisation. */
export enum OtaSyncStatus {
  NEVER = 'never',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  PARTIAL = 'partial',
  FAILED = 'failed',
}

/** Correspondance entre un type de chambre interne et celui de l'OTA. */
@Schema({ _id: false, timestamps: false })
export class OtaRoomMapping {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'RoomType', required: true })
  room_type_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  ota_room_type_id!: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  ota_rate_plan_id?: string;
}

export const OtaRoomMappingSchema =
  SchemaFactory.createForClass(OtaRoomMapping);

/** Statistiques de la dernière synchronisation. */
@Schema({ _id: false, timestamps: false })
export class OtaSyncStats {
  @Prop({ type: Number, min: 0, default: 0 })
  reservations_imported!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  availability_updates!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  rate_updates!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  error_count!: number;
}

export const OtaSyncStatsSchema = SchemaFactory.createForClass(OtaSyncStats);

/**
 * Connexion d'un établissement à une OTA (Booking, Expedia, Airbnb, Agoda) :
 * identifiants (non renvoyés par défaut), correspondance des types de
 * chambre et suivi des synchronisations.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'ota_connections',
})
export class OtaConnection extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(OtaProvider),
    required: true,
    index: true,
  })
  provider!: OtaProvider;

  /** Identifiant de l'établissement chez l'OTA (hotel id / listing id). */
  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  ota_property_id!: string;

  @Prop({ type: String, trim: true, maxlength: 150 })
  display_name?: string;

  /** Identifiants d'API — jamais renvoyés par défaut (`select: false`). */
  @Prop({ type: Object, select: false, default: () => ({}) })
  credentials!: Record<string, string>;

  @Prop({ type: [OtaRoomMappingSchema], default: [] })
  room_mappings!: OtaRoomMapping[];

  @Prop({
    type: String,
    enum: Object.values(OtaConnectionStatus),
    default: OtaConnectionStatus.PENDING,
    index: true,
  })
  status!: OtaConnectionStatus;

  @Prop({ type: Boolean, default: false, index: true })
  is_enabled!: boolean;

  @Prop({ type: Boolean, default: true })
  sync_availability!: boolean;

  @Prop({ type: Boolean, default: true })
  sync_rates!: boolean;

  @Prop({ type: Boolean, default: true })
  sync_reservations!: boolean;

  /** Commission de l'OTA en pourcentage. */
  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  commission_rate!: number;

  @Prop({
    type: String,
    enum: Object.values(OtaSyncStatus),
    default: OtaSyncStatus.NEVER,
  })
  sync_status!: OtaSyncStatus;

  @Prop({ type: Date })
  sync_started_at?: Date;

  @Prop({ type: Date, index: true })
  last_sync_at?: Date;

  @Prop({ type: Date })
  last_successful_sync_at?: Date;

  @Prop({ type: String, maxlength: 2000 })
  last_sync_error?: string;

  @Prop({ type: OtaSyncStatsSchema })
  last_sync_stats?: OtaSyncStats;

  @Prop({ type: Number, min: 0, default: 0 })
  consecutive_failures!: number;

  @Prop({ type: Date })
  last_tested_at?: Date;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const OtaConnectionSchema = SchemaFactory.createForClass(OtaConnection);

OtaConnectionSchema.index(
  { property_id: 1, provider: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } },
);
OtaConnectionSchema.index({ is_enabled: 1, last_sync_at: 1 });

/** Ne jamais sérialiser les identifiants, même chargés explicitement. */
OtaConnectionSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete (ret as unknown as Record<string, unknown>).credentials;
    return ret;
  },
});
