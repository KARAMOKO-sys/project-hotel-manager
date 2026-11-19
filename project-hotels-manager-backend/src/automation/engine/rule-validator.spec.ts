import { ConditionOperator } from './condition-evaluator';
import {
  AutomationActionType,
  validateActionParams,
  validateCondition,
  validateRuleDefinition,
} from './rule-validator';

describe('validateActionParams', () => {
  it('accepte des paramètres valides', () => {
    expect(
      validateActionParams(AutomationActionType.CREATE_ACTIVITY, {
        activity_type: 'call',
        summary: 'Appeler {{payload.guest_name}}',
        due_in_days: 2,
        assigned_to: '{{ payload.owner_id }}',
      }),
    ).toEqual([]);
    expect(
      validateActionParams(AutomationActionType.NOTIFY, {
        channel: 'email',
        recipient: '{{payload.email}}',
        message: 'Bonjour',
      }),
    ).toEqual([]);
    expect(
      validateActionParams(AutomationActionType.PUBLISH_EVENT, {
        topic: 'erp.invoice.paid',
      }),
    ).toEqual([]);
  });

  it('refuse type inconnu, paramètres manquants, inconnus ou mal formés', () => {
    expect(validateActionParams('webhook', {})).toHaveLength(1);
    expect(validateActionParams(AutomationActionType.POST_NOTE, {})).toEqual([
      'Paramètre obligatoire : body',
    ]);
    expect(
      validateActionParams(AutomationActionType.POST_NOTE, { body: 'x', y: 1 }),
    ).toEqual(['Paramètre inconnu : y']);
    expect(
      validateActionParams(AutomationActionType.CREATE_ACTIVITY, {
        activity_type: 'party',
        summary: 'x',
        due_in_days: 1000,
        assigned_to: 'bob',
      }),
    ).toHaveLength(3);
    expect(
      validateActionParams(AutomationActionType.NOTIFY, {
        channel: 'fax',
        recipient: 'x',
        message: 'y',
      }),
    ).toHaveLength(1);
    expect(
      validateActionParams(AutomationActionType.PUBLISH_EVENT, {
        topic: 'a b',
      }),
    ).toHaveLength(1);
  });
});

describe('validateCondition / validateRuleDefinition', () => {
  it('contrôle chemin, opérateur et valeur', () => {
    expect(
      validateCondition({
        path: 'payload.status',
        operator: ConditionOperator.IS_SET,
      }),
    ).toEqual([]);
    expect(
      validateCondition({
        path: 'payload.__proto__',
        operator: ConditionOperator.EQ,
        value: 1,
      }),
    ).toHaveLength(1);
    expect(
      validateCondition({
        path: 'payload.status',
        operator: ConditionOperator.EQ,
      }),
    ).toHaveLength(1);
    expect(
      validateCondition({
        path: 'payload.status',
        operator: ConditionOperator.IN,
        value: 'a',
      }),
    ).toHaveLength(1);
  });

  it('exige au moins une action', () => {
    expect(validateRuleDefinition([], [])).toEqual([
      'Au moins une action est requise',
    ]);
  });
});
