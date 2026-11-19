import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type AutomationRunDocument = HydratedDocument<AutomationRun>;

/** Durée de conservation du journal d'exécution. */
export const AUTOMATION_RUN_TTL_SECONDS = 90 * 24 * 3600;

/** Résultat global d'une exécution. */
export enum AutomationRunStatus {
  /** Exécution réservée, actions en cours. */
  RUNNING = 'running',
  SUCCESS = 'success',
  PARTIAL = 'partial',
  FAILED = 'failed',
  /** Conditions non satisfaites ou règle ignorée. */
  SKIPPED = 'skipped',
}

/** Résultat d'une action. */
export interface ActionResult {
  type: string;
  ok: boolean;
  error?: string;
  output?: Record<string, unknown>;
}

/**
 * Journal d'exécution d'une règle pour un événement (TTL 90 jours).
 * Unique (rule_id, event_id) : une règle ne traite un événement qu'une fois.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'automation_runs',
})
export class AutomationRun {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'AutomationRule', required: true })
  rule_id!: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 100 })
  event_id!: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  event_name!: string;

  @Prop({ type: SchemaTypes.ObjectId, index: true })
  organization_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: { _id: false, model: String, id: String }, default: undefined })
  record?: { model: string; id: string };

  @Prop({ type: Boolean, default: false })
  matched!: boolean;

  @Prop({
    type: String,
    enum: Object.values(AutomationRunStatus),
    required: true,
    index: true,
  })
  status!: AutomationRunStatus;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  actions_results!: ActionResult[];

  @Prop({ type: Number, default: 0 })
  duration_ms!: number;

  @Prop({ type: String, maxlength: 2000 })
  error?: string;

  created_at?: Date;
  updated_at?: Date;
}

export const AutomationRunSchema = SchemaFactory.createForClass(AutomationRun);
AutomationRunSchema.index({ rule_id: 1, event_id: 1 }, { unique: true });
AutomationRunSchema.index({ rule_id: 1, created_at: -1 });
AutomationRunSchema.index(
  { created_at: 1 },
  { expireAfterSeconds: AUTOMATION_RUN_TTL_SECONDS },
);
