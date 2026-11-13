import { ReportRecurrence, ReportType } from '../schemas/report.entity';

/** Ligne tabulaire d'un rapport. */
export type ReportRow = Record<string, unknown>;

export interface ColumnStats {
  total: number;
  average: number;
  min: number;
  max: number;
}

export interface ReportSummary {
  row_count: number;
  /** Statistiques des colonnes entièrement numériques. */
  numeric_columns: Record<string, ColumnStats>;
}

export interface CsvOptions {
  delimiter?: string;
  /** Ajoute un BOM UTF-8 (ouverture correcte des accents dans Excel). */
  bom?: boolean;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Colonnes déduites : union ordonnée des clés des lignes. */
export function inferColumns(rows: ReportRow[]): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

/**
 * Synthèse des lignes : une colonne est considérée numérique si toutes ses
 * valeurs renseignées sont des nombres finis (au moins une).
 */
export function summarizeRows(
  rows: ReportRow[],
  columns: string[] = inferColumns(rows),
): ReportSummary {
  const numeric_columns: Record<string, ColumnStats> = {};
  for (const column of columns) {
    const values = rows
      .map((r) => r[column])
      .filter((v) => v !== undefined && v !== null && v !== '');
    if (
      values.length === 0 ||
      !values.every((v) => typeof v === 'number' && Number.isFinite(v))
    ) {
      continue;
    }
    const nums = values as number[];
    const total = nums.reduce((s, v) => s + v, 0);
    numeric_columns[column] = {
      total: round2(total),
      average: round2(total / nums.length),
      min: Math.min(...nums),
      max: Math.max(...nums),
    };
  }
  return { row_count: rows.length, numeric_columns };
}

/** Échappe une cellule CSV (RFC 4180) et neutralise l'injection de formules. */
export function formatCsvCell(value: unknown, delimiter = ','): string {
  if (value === undefined || value === null) return '';
  let text: string;
  if (value instanceof Date) {
    text = value.toISOString();
  } else if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    text = String(value);
  } else if (typeof value === 'string') {
    text = value;
  } else {
    text = JSON.stringify(value) ?? '';
  }
  // Une cellule commençant par = + - @ serait interprétée comme formule.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  ) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Sérialise des lignes en CSV (en-tête + lignes, séparateur CRLF). */
export function toCsv(
  rows: ReportRow[],
  columns: string[] = inferColumns(rows),
  options: CsvOptions = {},
): string {
  const delimiter = options.delimiter ?? ',';
  const lines = [
    columns.map((c) => formatCsvCell(c, delimiter)).join(delimiter),
    ...rows.map((row) =>
      columns.map((c) => formatCsvCell(row[c], delimiter)).join(delimiter),
    ),
  ];
  return (options.bom ? '﻿' : '') + lines.join('\r\n');
}

function daysInMonthUtc(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Ajoute des mois en ramenant le jour au dernier jour du mois si besoin. */
export function addMonthsUtc(date: Date, months: number): Date {
  const total = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInMonthUtc(year, month));
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/** Prochaine exécution d'un rapport récurrent après `from`. */
export function computeNextRun(from: Date, recurrence: ReportRecurrence): Date {
  switch (recurrence) {
    case ReportRecurrence.DAILY:
      return new Date(from.getTime() + 86_400_000);
    case ReportRecurrence.WEEKLY:
      return new Date(from.getTime() + 7 * 86_400_000);
    case ReportRecurrence.MONTHLY:
      return addMonthsUtc(from, 1);
    case ReportRecurrence.YEARLY:
      return addMonthsUtc(from, 12);
    default:
      throw new Error(`Récurrence inconnue : ${String(recurrence)}`);
  }
}

/**
 * Période couverte par défaut selon le type (UTC) :
 * jour, mois ou année contenant la date de référence.
 * Retourne `null` pour les types sans période implicite.
 */
export function defaultPeriod(
  type: ReportType,
  reference: Date,
): { start: Date; end: Date } | null {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const d = reference.getUTCDate();
  switch (type) {
    case ReportType.DAILY:
      return {
        start: new Date(Date.UTC(y, m, d)),
        end: new Date(Date.UTC(y, m, d, 23, 59, 59, 999)),
      };
    case ReportType.MONTHLY:
      return {
        start: new Date(Date.UTC(y, m, 1)),
        end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
      };
    case ReportType.ANNUAL:
      return {
        start: new Date(Date.UTC(y, 0, 1)),
        end: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
      };
    default:
      return null;
  }
}

/** Nom de fichier d'export lisible et sans caractères spéciaux. */
export function exportFileName(
  name: string,
  periodStart: Date,
  extension: string,
): string {
  const slug =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'rapport';
  return `${slug}-${periodStart.toISOString().slice(0, 10)}.${extension}`;
}
