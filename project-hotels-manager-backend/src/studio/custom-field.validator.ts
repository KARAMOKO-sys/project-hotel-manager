import {
  CustomFieldDefinition,
  CustomFieldType,
  MAX_LENGTHS,
} from './custom-field-types';

/** Erreur de validation d'un champ. */
export interface CustomFieldError {
  key: string;
  message: string;
}

export type CoerceResult =
  { ok: true; value: unknown } | { ok: false; message: string };

export interface ValidateCustomValuesOptions {
  /** Valeurs déjà enregistrées (fusionnées avec la saisie). */
  existing?: Record<string, unknown>;
  /** Applique `default_value` aux champs absents (première saisie). */
  applyDefaults?: boolean;
}

export interface ValidateCustomValuesResult {
  /** Valeurs fusionnées et normalisées à enregistrer. */
  values: Record<string, unknown>;
  errors: CustomFieldError[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 ().-]{3,29}$/;
const INTEGER_PATTERN = /^[-+]?\d+$/;
const DECIMAL_PATTERN = /^[-+]?(\d+(\.\d*)?|\.\d+)$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(T.*)?$/;

const ok = (value: unknown): CoerceResult => ({ ok: true, value });
const fail = (message: string): CoerceResult => ({ ok: false, message });

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

function toNumber(raw: unknown, pattern: RegExp): number | undefined {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw === 'string' && pattern.test(raw.trim())) {
    const parsed = Number(raw.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function coerceText(raw: unknown, max: number): CoerceResult {
  if (typeof raw !== 'string') return fail('Texte attendu');
  const value = raw.trim();
  if (value.length > max) return fail(`${max} caractères maximum`);
  return ok(value);
}

function coerceDate(raw: unknown): CoerceResult {
  let date: Date | undefined;
  if (raw instanceof Date) date = raw;
  else if (typeof raw === 'string') {
    const match = DATE_PATTERN.exec(raw.trim());
    if (!match) return fail('Date attendue (AAAA-MM-JJ)');
    const [, y, m, d, time] = match;
    if (time) {
      date = new Date(raw.trim());
    } else {
      date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
      // Rejette les dates inexistantes (ex. 2026-02-30).
      if (
        date.getUTCFullYear() !== Number(y) ||
        date.getUTCMonth() !== Number(m) - 1 ||
        date.getUTCDate() !== Number(d)
      ) {
        return fail('Date invalide');
      }
    }
  }
  if (!date || Number.isNaN(date.getTime())) return fail('Date invalide');
  return ok(date.toISOString().slice(0, 10));
}

/**
 * Convertit et valide une valeur pour un champ. Une valeur vide (`null`,
 * chaîne vide, tableau vide) donne `null` (effacement).
 */
export function coerceFieldValue(
  field: CustomFieldDefinition,
  raw: unknown,
): CoerceResult {
  if (isEmpty(raw)) return ok(null);
  const options = new Set((field.options ?? []).map((option) => option.value));

  switch (field.field_type) {
    case CustomFieldType.TEXT:
    case CustomFieldType.LONG_TEXT:
      return coerceText(raw, MAX_LENGTHS[field.field_type] ?? 255);

    case CustomFieldType.INTEGER: {
      const value = toNumber(raw, INTEGER_PATTERN);
      if (value === undefined || !Number.isSafeInteger(value)) {
        return fail('Nombre entier attendu');
      }
      return ok(value);
    }

    case CustomFieldType.DECIMAL: {
      const value = toNumber(raw, DECIMAL_PATTERN);
      return value === undefined ? fail('Nombre attendu') : ok(value);
    }

    case CustomFieldType.MONETARY: {
      const value = toNumber(raw, DECIMAL_PATTERN);
      if (value === undefined) return fail('Montant attendu');
      return ok(Math.round(value * 100) / 100);
    }

    case CustomFieldType.BOOLEAN:
      if (typeof raw === 'boolean') return ok(raw);
      if (raw === 'true' || raw === '1' || raw === 1) return ok(true);
      if (raw === 'false' || raw === '0' || raw === 0) return ok(false);
      return fail('Booléen attendu');

    case CustomFieldType.DATE:
      return coerceDate(raw);

    case CustomFieldType.SELECTION:
      if (typeof raw !== 'string' || !options.has(raw)) {
        return fail('Valeur hors de la liste autorisée');
      }
      return ok(raw);

    case CustomFieldType.MULTI_SELECTION: {
      if (!Array.isArray(raw)) return fail('Liste de valeurs attendue');
      const values: string[] = [];
      for (const item of raw) {
        if (typeof item !== 'string' || !options.has(item)) {
          return fail(`Valeur hors de la liste autorisée : ${String(item)}`);
        }
        if (!values.includes(item)) values.push(item);
      }
      return ok(values);
    }

    case CustomFieldType.EMAIL: {
      const text = coerceText(raw, MAX_LENGTHS[CustomFieldType.EMAIL] ?? 320);
      if (!text.ok) return text;
      const value = (text.value as string).toLowerCase();
      return EMAIL_PATTERN.test(value)
        ? ok(value)
        : fail('Adresse email invalide');
    }

    case CustomFieldType.PHONE: {
      const text = coerceText(raw, MAX_LENGTHS[CustomFieldType.PHONE] ?? 30);
      if (!text.ok) return text;
      const value = text.value as string;
      const digits = value.replace(/\D/g, '').length;
      return PHONE_PATTERN.test(value) && digits >= 4
        ? ok(value)
        : fail('Numéro de téléphone invalide');
    }

    case CustomFieldType.URL: {
      const text = coerceText(raw, MAX_LENGTHS[CustomFieldType.URL] ?? 2048);
      if (!text.ok) return text;
      const value = text.value as string;
      try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return fail('URL http(s) attendue');
        }
      } catch {
        return fail('URL invalide');
      }
      return ok(value);
    }

    default:
      return fail(
        `Type de champ non pris en charge : ${String(field.field_type)}`,
      );
  }
}

/**
 * Valide un objet de valeurs contre les définitions de champs actives :
 * clés inconnues refusées, types convertis, sélections vérifiées, champs
 * obligatoires contrôlés sur le résultat fusionné. `null` efface une valeur.
 *
 * Fonction pure : aucune dépendance à la base de données.
 */
export function validateCustomValues(
  fields: CustomFieldDefinition[],
  input: unknown,
  options: ValidateCustomValuesOptions = {},
): ValidateCustomValuesResult {
  const errors: CustomFieldError[] = [];
  const merged: Record<string, unknown> = { ...(options.existing ?? {}) };

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      values: merged,
      errors: [{ key: '*', message: 'Objet de valeurs attendu' }],
    };
  }

  const active = new Map(
    fields
      .filter((field) => field.is_active !== false)
      .map((field) => [field.key, field]),
  );

  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const field = active.get(key);
    if (!field) {
      errors.push({ key, message: 'Champ inconnu' });
      continue;
    }
    const result = coerceFieldValue(field, raw);
    if (!result.ok) {
      errors.push({ key, message: `${field.label} : ${result.message}` });
      continue;
    }
    if (result.value === null) delete merged[key];
    else merged[key] = result.value;
  }

  for (const field of active.values()) {
    if (
      options.applyDefaults &&
      !(field.key in merged) &&
      !(field.key in (input as Record<string, unknown>)) &&
      !isEmpty(field.default_value)
    ) {
      const result = coerceFieldValue(field, field.default_value);
      if (result.ok && result.value !== null) merged[field.key] = result.value;
    }
    if (field.required && isEmpty(merged[field.key])) {
      errors.push({
        key: field.key,
        message: `${field.label} : champ obligatoire`,
      });
    }
  }

  return { values: merged, errors };
}
