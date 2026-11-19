// src/lib/forms.ts
// Conversion valeurs API <-> valeurs de formulaire et chargement des listes
// d'options pour les champs déclaratifs (ResourceField).

import { apiFetch, type QueryValue } from "./api";
import type { ResourceField } from "./resources";
import type { Entity } from "./types";

export type LineRow = Record<string, string>;
export type FormValue = string | boolean | LineRow[];
export type FormValues = Record<string, FormValue>;
export interface FieldOption {
  value: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/* Accès aux valeurs                                                   */
/* ------------------------------------------------------------------ */

export function getNestedValue(row: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((value, part) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[part];
  }, row);
}

export function setNestedValue(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  const parts = key.split(".");
  let current = target;
  parts.slice(0, -1).forEach((part) => {
    const next = current[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  });
  current[parts[parts.length - 1]] = value;
}

/** Identifiant d'une référence (chaîne, ObjectId sérialisé ou document peuplé). */
export function refValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj._id ?? obj.id ?? "");
  }
  return String(value);
}

/* ------------------------------------------------------------------ */
/* Libellés d'options                                                  */
/* ------------------------------------------------------------------ */

/**
 * Libellé d'un élément selon une spécification `a|b` (premier renseigné) et
 * `a+b` (concaténation).
 */
export function labelFromSpec(item: Record<string, unknown>, spec?: string): string {
  if (spec) {
    const parts = spec
      .split("+")
      .map((part) => {
        for (const key of part.split("|")) {
          const value = getNestedValue(item, key.trim());
          if (value !== undefined && value !== null && value !== "") {
            return String(value);
          }
        }
        return "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" — ");
  }
  const fallback =
    item.name ?? item.title ?? item.number ?? item.code ?? item.email ?? item.label;
  if (fallback !== undefined && fallback !== null && fallback !== "") {
    return String(fallback);
  }
  return refValue(item);
}

export function optionsKey(field: Pick<ResourceField, "optionsEndpoint" | "optionLabel" | "optionValue">): string {
  return `${field.optionsEndpoint ?? ""}#${field.optionLabel ?? ""}#${field.optionValue ?? ""}`;
}

const UNSCOPED_ENDPOINTS = ["/organizations", "/properties", "/apps/events"];

/** Charge une liste d'options (réponse paginée ou tableau brut). */
export async function loadOptions(
  endpoint: string,
  labelSpec: string | undefined,
  valueKey: string | undefined,
  scope: Record<string, QueryValue> = {},
): Promise<FieldOption[]> {
  const params = new URLSearchParams({ page: "1", limit: "100" });
  if (!UNSCOPED_ENDPOINTS.includes(endpoint)) {
    Object.entries(scope).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
  }
  const response = await apiFetch<unknown>(`${endpoint}?${params.toString()}`);
  const items: unknown[] = Array.isArray(response)
    ? response
    : response && typeof response === "object" && Array.isArray((response as { data?: unknown }).data)
      ? ((response as { data: unknown[] }).data)
      : [];
  return items
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return { value: String(item), label: String(item) };
      }
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const value = valueKey ? refValue(getNestedValue(record, valueKey)) : refValue(record);
      return value ? { value, label: labelFromSpec(record, labelSpec) } : null;
    })
    .filter((option): option is FieldOption => option !== null);
}

/** Champs (y compris ceux des lignes) dont les options viennent de l'API. */
export function remoteOptionFields(fields: ResourceField[]): ResourceField[] {
  const result: ResourceField[] = [];
  const seen = new Set<string>();
  const visit = (list: ResourceField[]) => {
    list.forEach((field) => {
      if (field.optionsEndpoint && !field.options) {
        const key = optionsKey(field);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(field);
        }
      }
      if (field.lineFields) visit(field.lineFields);
    });
  };
  visit(fields);
  return result;
}

/* ------------------------------------------------------------------ */
/* Conversion                                                          */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");

function toLocalDateTime(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function scalarToInput(field: ResourceField, value: unknown): string {
  if (value === undefined || value === null) return "";
  switch (field.type) {
    case "date":
      return String(value).slice(0, 10);
    case "datetime":
      return toLocalDateTime(value);
    case "select":
    case "relation":
      return refValue(value);
    case "list":
      return Array.isArray(value) ? value.map(String).join(", ") : String(value);
    case "json":
      return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    default:
      return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

/** Valeur de formulaire initiale d'un champ à partir d'une ligne de l'API. */
export function toFormValue(field: ResourceField, value: unknown): FormValue {
  if (field.type === "boolean") return Boolean(value);
  if (field.type === "lines") {
    if (!Array.isArray(value)) return [];
    return value.map((line) => {
      const item = (line ?? {}) as Record<string, unknown>;
      return Object.fromEntries(
        (field.lineFields ?? []).map((sub) => [sub.key, scalarToInput(sub, item[sub.key])]),
      );
    });
  }
  return scalarToInput(field, value);
}

export function defaultFormValue(field: ResourceField): FormValue {
  if (field.type === "boolean") return Boolean(field.defaultValue);
  if (field.type === "lines") return [];
  return typeof field.defaultValue === "string" ? field.defaultValue : "";
}

export class FieldValueError extends Error {}

function convertScalar(field: ResourceField, raw: string): unknown {
  const value = raw.trim();
  switch (field.type) {
    case "number": {
      const num = Number(value.replace(",", "."));
      if (!Number.isFinite(num)) {
        throw new FieldValueError(`« ${field.label} » doit être un nombre.`);
      }
      return num;
    }
    case "datetime": {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new FieldValueError(`« ${field.label} » : date invalide.`);
      }
      return date.toISOString();
    }
    case "list":
      return value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    case "json":
      try {
        return JSON.parse(value) as unknown;
      } catch {
        throw new FieldValueError(`« ${field.label} » : JSON invalide.`);
      }
    case "password":
    case "textarea":
      return raw;
    default:
      return value;
  }
}

/**
 * Valeur API d'un champ. `undefined` : champ vide et facultatif, à omettre.
 * Lève FieldValueError pour une saisie invalide.
 */
export function fromFormValue(field: ResourceField, value: FormValue | undefined): unknown {
  if (field.type === "boolean") return Boolean(value);
  if (field.type === "lines") {
    const rows = Array.isArray(value) ? value : [];
    const lineFields = field.lineFields ?? [];
    const converted = rows
      .filter((row) => Object.values(row).some((cell) => cell.trim() !== ""))
      .map((row, index) => {
        const line: Record<string, unknown> = {};
        lineFields.forEach((sub) => {
          const cell = row[sub.key] ?? "";
          if (cell.trim() === "") {
            if (sub.required) {
              throw new FieldValueError(
                `${field.label}, ligne ${index + 1} : « ${sub.label} » est obligatoire.`,
              );
            }
            return;
          }
          line[sub.key] = convertScalar(sub, cell);
        });
        return line;
      });
    if (field.required && converted.length === 0) {
      throw new FieldValueError(`Ajoutez au moins une ligne dans « ${field.label} ».`);
    }
    return converted;
  }
  const raw = typeof value === "string" ? value : "";
  if (raw.trim() === "") {
    if (field.required) {
      throw new FieldValueError(`« ${field.label} » est obligatoire.`);
    }
    return undefined;
  }
  return convertScalar(field, raw);
}

/** Corps de requête à partir d'une liste de champs (dialogues d'action). */
export function buildPayload(
  fields: ResourceField[],
  values: FormValues,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  fields.forEach((field) => {
    const converted = fromFormValue(field, values[field.key]);
    if (converted !== undefined) setNestedValue(payload, field.key, converted);
  });
  return payload;
}

export function initialValues(fields: ResourceField[], row?: Entity): FormValues {
  return Object.fromEntries(
    fields.map((field) => [
      field.key,
      row ? toFormValue(field, getNestedValue(row, field.key)) : defaultFormValue(field),
    ]),
  );
}
