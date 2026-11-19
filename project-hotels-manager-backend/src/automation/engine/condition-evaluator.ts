import { getPath } from './path';

/** Opérateurs de comparaison des conditions. */
export enum ConditionOperator {
  EQ = 'eq',
  NEQ = 'neq',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_SET = 'is_set',
  IS_NOT_SET = 'is_not_set',
}

/** Combinaison des conditions. */
export enum ConditionLogic {
  ALL = 'all',
  ANY = 'any',
}

/** Opérateurs sans valeur de comparaison. */
export const UNARY_OPERATORS: readonly ConditionOperator[] = [
  ConditionOperator.IS_SET,
  ConditionOperator.IS_NOT_SET,
];

/** Opérateurs attendant une liste. */
export const LIST_OPERATORS: readonly ConditionOperator[] = [
  ConditionOperator.IN,
  ConditionOperator.NOT_IN,
];

export interface RuleCondition {
  path: string;
  operator: ConditionOperator;
  value?: unknown;
}

export interface ConditionDetail {
  path: string;
  operator: ConditionOperator;
  expected: unknown;
  actual: unknown;
  result: boolean;
}

export interface ConditionsEvaluation {
  matched: boolean;
  logic: ConditionLogic;
  details: ConditionDetail[];
}

const NUMERIC = /^[-+]?(\d+(\.\d*)?|\.\d+)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && NUMERIC.test(value.trim())) {
    return Number(value.trim());
  }
  return undefined;
}

/** Valeur comparable (nombre ou horodatage) pour gt/gte/lt/lte. */
function asComparable(value: unknown): number | undefined {
  const number = asNumber(value);
  if (number !== undefined) return number;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? undefined : time;
  }
  if (typeof value === 'string' && ISO_DATE.test(value.trim())) {
    const time = new Date(value.trim()).getTime();
    return Number.isNaN(time) ? undefined : time;
  }
  return undefined;
}

function asText(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

/** Égalité tolérante : nombres et chaînes numériques, booléens, dates, ObjectId. */
export function looseEquals(actual: unknown, expected: unknown): boolean {
  if (actual === undefined || actual === null) {
    return expected === undefined || expected === null;
  }
  if (expected === undefined || expected === null) return false;
  const a = asNumber(actual);
  const b = asNumber(expected);
  if (a !== undefined && b !== undefined) return a === b;
  if (actual instanceof Date || expected instanceof Date) {
    const ta = asComparable(actual);
    const tb = asComparable(expected);
    return ta !== undefined && ta === tb;
  }
  return asText(actual) === asText(expected);
}

function contains(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(actual)) {
    return actual.some((item) => looseEquals(item, expected));
  }
  if (typeof actual === 'string') {
    if (expected === undefined || expected === null) return false;
    return actual.toLowerCase().includes(asText(expected).toLowerCase());
  }
  return false;
}

function isSet(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function compare(
  actual: unknown,
  expected: unknown,
  test: (a: number, b: number) => boolean,
): boolean {
  const a = asComparable(actual);
  const b = asComparable(expected);
  return a !== undefined && b !== undefined && test(a, b);
}

/** Évalue une condition sur une valeur (fonction pure). */
export function applyOperator(
  operator: ConditionOperator,
  actual: unknown,
  expected: unknown,
): boolean {
  switch (operator) {
    case ConditionOperator.EQ:
      return looseEquals(actual, expected);
    case ConditionOperator.NEQ:
      return !looseEquals(actual, expected);
    case ConditionOperator.GT:
      return compare(actual, expected, (a, b) => a > b);
    case ConditionOperator.GTE:
      return compare(actual, expected, (a, b) => a >= b);
    case ConditionOperator.LT:
      return compare(actual, expected, (a, b) => a < b);
    case ConditionOperator.LTE:
      return compare(actual, expected, (a, b) => a <= b);
    case ConditionOperator.CONTAINS:
      return contains(actual, expected);
    case ConditionOperator.NOT_CONTAINS:
      return !contains(actual, expected);
    case ConditionOperator.IN:
      return (
        Array.isArray(expected) &&
        expected.some((item) => looseEquals(actual, item))
      );
    case ConditionOperator.NOT_IN:
      return (
        Array.isArray(expected) &&
        !expected.some((item) => looseEquals(actual, item))
      );
    case ConditionOperator.IS_SET:
      return isSet(actual);
    case ConditionOperator.IS_NOT_SET:
      return !isSet(actual);
    default:
      return false;
  }
}

/**
 * Évalue les conditions d'une règle sur l'enveloppe d'un événement.
 * Sans condition, la règle correspond toujours.
 */
export function evaluateConditions(
  envelope: unknown,
  conditions: RuleCondition[] | undefined,
  logic: ConditionLogic = ConditionLogic.ALL,
): ConditionsEvaluation {
  const details = (conditions ?? []).map((condition) => {
    const actual = getPath(envelope, condition.path);
    return {
      path: condition.path,
      operator: condition.operator,
      expected: condition.value,
      actual,
      result: applyOperator(condition.operator, actual, condition.value),
    };
  });
  const matched =
    details.length === 0
      ? true
      : logic === ConditionLogic.ANY
        ? details.some((detail) => detail.result)
        : details.every((detail) => detail.result);
  return { matched, logic, details };
}
