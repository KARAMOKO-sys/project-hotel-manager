import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { DOMAIN_EVENT_NAMES } from '../../platform/events/domain-events';
import type { DomainEventName } from '../../platform/events/domain-events';
import {
  ConditionLogic,
  ConditionOperator,
  RuleCondition,
} from '../engine/condition-evaluator';
import { AutomationActionType, RuleAction } from '../engine/rule-validator';

export type AutomationRuleDocument = HydratedDocument<AutomationRule>;

/** Règle « quand… si… alors… » déclenchée par un événement métier. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'automation_rules',
})
export class AutomationRule extends AuditableEntity {
  /** Portée organisation (exclusive avec `property_id`). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', index: true })
  organization_id?: Types.ObjectId;

  /** Portée établissement (exclusive avec `organization_id`). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({ type: String, maxlength: 2000 })
  description?: string;

  @Prop({ type: String, enum: DOMAIN_EVENT_NAMES, required: true, index: true })
  trigger_event!: DomainEventName;

  @Prop({
    type: [
      {
        _id: false,
        path: { type: String, required: true },
        operator: {
          type: String,
          enum: Object.values(ConditionOperator),
          required: true,
        },
        value: { type: SchemaTypes.Mixed },
      },
    ],
    default: [],
  })
  conditions!: RuleCondition[];

  @Prop({
    type: String,
    enum: Object.values(ConditionLogic),
    default: ConditionLogic.ALL,
  })
  condition_logic!: ConditionLogic;

  @Prop({
    type: [
      {
        _id: false,
        type: {
          type: String,
          enum: Object.values(AutomationActionType),
          required: true,
        },
        params: { type: SchemaTypes.Mixed, default: {} },
      },
    ],
    default: [],
  })
  actions!: RuleAction[];

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;

  @Prop({ type: Date })
  last_run_at?: Date;

  @Prop({ type: Number, default: 0 })
  run_count!: number;

  @Prop({ type: Number, default: 0 })
  error_count!: number;

  @Prop({ type: SchemaTypes.ObjectId })
  created_by?: Types.ObjectId;
}

export const AutomationRuleSchema =
  SchemaFactory.createForClass(AutomationRule);
AutomationRuleSchema.index({
  organization_id: 1,
  trigger_event: 1,
  is_active: 1,
});
AutomationRuleSchema.index({ property_id: 1, trigger_event: 1, is_active: 1 });
