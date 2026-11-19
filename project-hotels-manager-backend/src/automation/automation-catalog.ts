import { DOMAIN_EVENT_NAMES } from '../platform/events/domain-events';
import { DOMAIN_EVENT_LABELS } from '../activity/activity-event-labels';
import {
  ConditionLogic,
  ConditionOperator,
  LIST_OPERATORS,
  UNARY_OPERATORS,
} from './engine/condition-evaluator';
import { ACTION_TYPE_SCHEMAS } from './engine/rule-validator';
import { INTEGRATION_OUTBOUND_CHANNEL } from './services/automation-actions.service';
import { AUTOMATION_ACTOR_PREFIX, MAX_CHAIN_DEPTH } from './engine/loop-guard';

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  [ConditionOperator.EQ]: 'est égal à',
  [ConditionOperator.NEQ]: 'est différent de',
  [ConditionOperator.GT]: 'est supérieur à',
  [ConditionOperator.GTE]: 'est supérieur ou égal à',
  [ConditionOperator.LT]: 'est inférieur à',
  [ConditionOperator.LTE]: 'est inférieur ou égal à',
  [ConditionOperator.CONTAINS]: 'contient',
  [ConditionOperator.NOT_CONTAINS]: 'ne contient pas',
  [ConditionOperator.IN]: 'fait partie de',
  [ConditionOperator.NOT_IN]: 'ne fait pas partie de',
  [ConditionOperator.IS_SET]: 'est renseigné',
  [ConditionOperator.IS_NOT_SET]: "n'est pas renseigné",
};

/** Catalogue pour l'éditeur de règles du back-office. */
export function buildAutomationCatalog() {
  return {
    events: DOMAIN_EVENT_NAMES.map((name) => ({
      name,
      label: DOMAIN_EVENT_LABELS[name],
    })),
    operators: Object.values(ConditionOperator).map((value) => ({
      value,
      label: OPERATOR_LABELS[value],
      requires_value: !UNARY_OPERATORS.includes(value),
      value_kind: LIST_OPERATORS.includes(value)
        ? 'list'
        : UNARY_OPERATORS.includes(value)
          ? 'none'
          : 'scalar',
    })),
    condition_logic: [
      { value: ConditionLogic.ALL, label: 'Toutes les conditions' },
      { value: ConditionLogic.ANY, label: 'Au moins une condition' },
    ],
    paths: [
      'id',
      'name',
      'occurred_at',
      'organization_id',
      'property_id',
      'actor_id',
      'record.model',
      'record.id',
      'payload.<champ>',
    ],
    action_types: ACTION_TYPE_SCHEMAS,
    templating:
      'Seules les références {{ chemin.pointé }} vers l’enveloppe de l’événement sont résolues (aucune expression).',
    outbound_channel: INTEGRATION_OUTBOUND_CHANNEL,
    loop_protection: {
      ignored_actor_prefix: AUTOMATION_ACTOR_PREFIX,
      max_chain_depth: MAX_CHAIN_DEPTH,
    },
  };
}
