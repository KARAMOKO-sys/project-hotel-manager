import {
  applyOperator,
  ConditionLogic,
  ConditionOperator as Op,
  evaluateConditions,
} from './condition-evaluator';
import { getPath } from './path';

const event = {
  id: 'e1',
  name: 'billing.invoice.paid',
  property_id: '64b000000000000000000001',
  record: { model: 'Invoice', id: '64b000000000000000000002' },
  payload: {
    total_amount: 150000,
    status: 'paid',
    tags: ['vip', 'groupe'],
    note: 'Client Important',
    paid_at: '2026-11-17T10:00:00.000Z',
    empty: '',
    zero: 0,
  },
};

describe('getPath', () => {
  it('lit les chemins pointés et ignore le prototype', () => {
    expect(getPath(event, 'payload.total_amount')).toBe(150000);
    expect(getPath(event, 'payload.tags.1')).toBe('groupe');
    expect(getPath(event, 'payload.absent.deep')).toBeUndefined();
    expect(getPath(event, 'payload.constructor')).toBeUndefined();
    expect(getPath(event, '__proto__')).toBeUndefined();
    expect(getPath(event, 'payload.note.length')).toBeUndefined();
  });
});

describe('applyOperator', () => {
  it.each([
    [Op.EQ, 'payload.status', 'paid', true],
    [Op.EQ, 'payload.total_amount', '150000', true],
    [Op.NEQ, 'payload.status', 'draft', true],
    [Op.GT, 'payload.total_amount', 100000, true],
    [Op.GT, 'payload.total_amount', 150000, false],
    [Op.GTE, 'payload.total_amount', 150000, true],
    [Op.LT, 'payload.total_amount', '200000', true],
    [Op.LTE, 'payload.total_amount', 149999, false],
    [Op.GT, 'payload.paid_at', '2026-11-01', true],
    [Op.CONTAINS, 'payload.note', 'important', true],
    [Op.CONTAINS, 'payload.tags', 'vip', true],
    [Op.NOT_CONTAINS, 'payload.tags', 'solo', true],
    [Op.IN, 'payload.status', ['paid', 'partial'], true],
    [Op.IN, 'payload.status', 'paid', false],
    [Op.NOT_IN, 'payload.status', ['draft'], true],
    [Op.IS_SET, 'payload.zero', undefined, true],
    [Op.IS_SET, 'payload.empty', undefined, false],
    [Op.IS_NOT_SET, 'payload.absent', undefined, true],
    [Op.EQ, 'record.model', 'Invoice', true],
  ])('%s sur %s (%p) → %p', (operator, path, value, expected) => {
    expect(applyOperator(operator, getPath(event, path), value)).toBe(expected);
  });

  it('gère les chemins absents sans erreur', () => {
    const missing = getPath(event, 'payload.missing');
    expect(applyOperator(Op.EQ, missing, 'x')).toBe(false);
    expect(applyOperator(Op.EQ, missing, null)).toBe(true);
    expect(applyOperator(Op.NEQ, missing, 'x')).toBe(true);
    expect(applyOperator(Op.GT, missing, 1)).toBe(false);
    expect(applyOperator(Op.LT, missing, 1)).toBe(false);
    expect(applyOperator(Op.CONTAINS, missing, 'x')).toBe(false);
    expect(applyOperator(Op.NOT_CONTAINS, missing, 'x')).toBe(true);
    expect(applyOperator(Op.IN, missing, ['x'])).toBe(false);
    expect(applyOperator(Op.GT, 'abc', 1)).toBe(false);
  });
});

describe('evaluateConditions', () => {
  const conditions = [
    { path: 'payload.total_amount', operator: Op.GTE, value: 100000 },
    { path: 'payload.status', operator: Op.EQ, value: 'draft' },
  ];

  it('combine en « toutes » ou « au moins une »', () => {
    expect(
      evaluateConditions(event, conditions, ConditionLogic.ALL).matched,
    ).toBe(false);
    const any = evaluateConditions(event, conditions, ConditionLogic.ANY);
    expect(any.matched).toBe(true);
    expect(any.details.map((d) => d.result)).toEqual([true, false]);
  });

  it('correspond toujours sans condition', () => {
    expect(evaluateConditions(event, []).matched).toBe(true);
  });
});
