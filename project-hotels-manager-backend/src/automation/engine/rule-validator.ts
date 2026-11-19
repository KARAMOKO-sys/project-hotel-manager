import { RecordActivityType } from '../../activity/schemas/record-activity.entity';
import {
  ConditionOperator,
  LIST_OPERATORS,
  RuleCondition,
  UNARY_OPERATORS,
} from './condition-evaluator';
import { isValidPath } from './path';

/** Types d'actions des règles. */
export enum AutomationActionType {
  CREATE_ACTIVITY = 'create_activity',
  POST_NOTE = 'post_note',
  NOTIFY = 'notify',
  PUBLISH_EVENT = 'publish_event',
}

/** Canaux de l'action `notify`. */
export const NOTIFY_CHANNELS = ['email', 'sms', 'in_app'] as const;

export interface RuleAction {
  type: AutomationActionType;
  params: Record<string, unknown>;
}

/** Description d'un paramètre d'action (catalogue de l'éditeur). */
export interface ActionParamSchema {
  name: string;
  type: 'string' | 'text' | 'integer' | 'enum' | 'object_id_or_template';
  required: boolean;
  label: string;
  enum?: readonly string[];
  min?: number;
  max?: number;
  max_length?: number;
  templating?: boolean;
}

export interface ActionTypeSchema {
  type: AutomationActionType;
  label: string;
  description: string;
  requires_record: boolean;
  params: ActionParamSchema[];
}

/** Catalogue des actions et de leurs paramètres. */
export const ACTION_TYPE_SCHEMAS: ActionTypeSchema[] = [
  {
    type: AutomationActionType.CREATE_ACTIVITY,
    label: 'Planifier une activité',
    description: "Planifie une activité sur la fiche de l'événement.",
    requires_record: true,
    params: [
      {
        name: 'activity_type',
        type: 'enum',
        required: true,
        label: "Type d'activité",
        enum: Object.values(RecordActivityType),
      },
      {
        name: 'summary',
        type: 'string',
        required: true,
        label: 'Résumé',
        max_length: 255,
        templating: true,
      },
      {
        name: 'due_in_days',
        type: 'integer',
        required: false,
        label: 'Échéance (jours)',
        min: 0,
        max: 365,
      },
      {
        name: 'assigned_to',
        type: 'object_id_or_template',
        required: false,
        label: 'Assigné à (identifiant ou {{payload.chemin}})',
        templating: true,
      },
      {
        name: 'note',
        type: 'text',
        required: false,
        label: 'Note',
        max_length: 10000,
        templating: true,
      },
    ],
  },
  {
    type: AutomationActionType.POST_NOTE,
    label: 'Publier une note',
    description: "Ajoute une note dans le fil de la fiche de l'événement.",
    requires_record: true,
    params: [
      {
        name: 'body',
        type: 'text',
        required: true,
        label: 'Texte ({{chemin}} autorisés)',
        max_length: 10000,
        templating: true,
      },
    ],
  },
  {
    type: AutomationActionType.NOTIFY,
    label: 'Envoyer une notification',
    description:
      "Met en file d'attente une notification (journal des notifications).",
    requires_record: false,
    params: [
      {
        name: 'channel',
        type: 'enum',
        required: true,
        label: 'Canal',
        enum: NOTIFY_CHANNELS,
      },
      {
        name: 'recipient',
        type: 'string',
        required: true,
        label: 'Destinataire (adresse, identifiant ou {{payload.chemin}})',
        max_length: 320,
        templating: true,
      },
      {
        name: 'subject',
        type: 'string',
        required: false,
        label: 'Objet',
        max_length: 255,
        templating: true,
      },
      {
        name: 'message',
        type: 'text',
        required: true,
        label: 'Message',
        max_length: 10000,
        templating: true,
      },
    ],
  },
  {
    type: AutomationActionType.PUBLISH_EVENT,
    label: 'Publier vers le bus d’intégration',
    description:
      "Émet l'événement sur le canal interne `integration.outbound` (repris par l'ESB).",
    requires_record: false,
    params: [
      {
        name: 'topic',
        type: 'string',
        required: true,
        label: 'Sujet',
        max_length: 200,
      },
    ],
  },
];

const ACTION_SCHEMA_BY_TYPE = new Map(
  ACTION_TYPE_SCHEMAS.map((schema) => [schema.type, schema]),
);

const TOPIC_PATTERN = /^[A-Za-z0-9_.:-]{1,200}$/;
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const TEMPLATE_ONLY = /^\{\{\s*[A-Za-z0-9_.]{1,200}\s*\}\}$/;

/** Valide les paramètres d'une action ; retourne la liste des erreurs. */
export function validateActionParams(type: unknown, params: unknown): string[] {
  const schema = ACTION_SCHEMA_BY_TYPE.get(type as AutomationActionType);
  if (!schema) return [`Type d'action inconnu : ${String(type)}`];
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return ['Paramètres attendus sous forme d’objet'];
  }
  const values = params as Record<string, unknown>;
  const errors: string[] = [];
  const known = new Set(schema.params.map((param) => param.name));
  for (const key of Object.keys(values)) {
    if (!known.has(key)) errors.push(`Paramètre inconnu : ${key}`);
  }
  for (const param of schema.params) {
    const value = values[param.name];
    if (value === undefined || value === null || value === '') {
      if (param.required) errors.push(`Paramètre obligatoire : ${param.name}`);
      continue;
    }
    switch (param.type) {
      case 'string':
      case 'text':
        if (typeof value !== 'string') {
          errors.push(`${param.name} : texte attendu`);
        } else if (param.max_length && value.length > param.max_length) {
          errors.push(`${param.name} : ${param.max_length} caractères maximum`);
        }
        break;
      case 'integer':
        if (
          typeof value !== 'number' ||
          !Number.isInteger(value) ||
          (param.min !== undefined && value < param.min) ||
          (param.max !== undefined && value > param.max)
        ) {
          errors.push(
            `${param.name} : entier entre ${param.min ?? '-∞'} et ${param.max ?? '+∞'} attendu`,
          );
        }
        break;
      case 'enum':
        if (!param.enum?.includes(value as string)) {
          errors.push(
            `${param.name} : valeur attendue parmi ${param.enum?.join(', ')}`,
          );
        }
        break;
      case 'object_id_or_template':
        if (
          typeof value !== 'string' ||
          !(OBJECT_ID_PATTERN.test(value) || TEMPLATE_ONLY.test(value.trim()))
        ) {
          errors.push(`${param.name} : identifiant ou {{chemin}} attendu`);
        }
        break;
    }
  }
  if (
    schema.type === AutomationActionType.PUBLISH_EVENT &&
    typeof values.topic === 'string' &&
    !TOPIC_PATTERN.test(values.topic)
  ) {
    errors.push(
      'topic : lettres, chiffres, « . », « _ », « : » ou « - » uniquement',
    );
  }
  return errors;
}

/** Valide une condition ; retourne la liste des erreurs. */
export function validateCondition(condition: RuleCondition): string[] {
  const errors: string[] = [];
  if (!isValidPath(condition.path)) {
    errors.push(`Chemin invalide : ${String(condition.path)}`);
  }
  if (!Object.values(ConditionOperator).includes(condition.operator)) {
    errors.push(`Opérateur inconnu : ${String(condition.operator)}`);
    return errors;
  }
  if (UNARY_OPERATORS.includes(condition.operator)) return errors;
  if (condition.value === undefined) {
    errors.push(`Valeur requise pour l'opérateur ${condition.operator}`);
  } else if (
    LIST_OPERATORS.includes(condition.operator) &&
    !Array.isArray(condition.value)
  ) {
    errors.push(`Liste attendue pour l'opérateur ${condition.operator}`);
  }
  return errors;
}

/** Valide conditions et actions d'une règle ; retourne toutes les erreurs. */
export function validateRuleDefinition(
  conditions: RuleCondition[] = [],
  actions: RuleAction[] = [],
): string[] {
  const errors: string[] = [];
  conditions.forEach((condition, index) =>
    validateCondition(condition).forEach((error) =>
      errors.push(`Condition ${index + 1} : ${error}`),
    ),
  );
  if (!actions.length) errors.push('Au moins une action est requise');
  actions.forEach((action, index) =>
    validateActionParams(action.type, action.params).forEach((error) =>
      errors.push(`Action ${index + 1} (${String(action.type)}) : ${error}`),
    ),
  );
  return errors;
}
