import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Fonctions pures de l'application RH : dates « jour » (UTC minuit), calcul
 * des jours de congé, créneaux horaires (y compris de nuit) et heures
 * travaillées. Aucune dépendance à Mongoose : testables isolément.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

/** Format `HH:mm` (00:00 → 23:59). */
export const HOUR_MINUTE_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Semaine de travail par défaut : lundi → samedi (0 = dimanche). */
export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];

/** Convertit une chaîne en ObjectId ou lève une 400 explicite. */
export function toObjectId(value: unknown, field: string): Types.ObjectId {
  if (value instanceof Types.ObjectId) return value;
  const text = typeof value === 'string' ? value : '';
  if (!Types.ObjectId.isValid(text)) {
    throw new BadRequestException(`Identifiant invalide pour « ${field} »`);
  }
  return new Types.ObjectId(text);
}

/** Échappe une saisie utilisateur avant usage dans un `$regex`. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Arrondi à deux décimales. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Ramène une date (chaîne `YYYY-MM-DD`, ISO ou `Date`) à minuit UTC.
 * Les dates « jour » (congés, planning) sont toutes stockées ainsi.
 */
export function toDay(input: string | Date): Date {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Date invalide : ${String(input)}`);
  }
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Clé `YYYY-MM-DD` d'une date (UTC). */
export function dayKey(date: Date): string {
  return toDay(date).toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(toDay(date).getTime() + days * DAY_MS);
}

/** Nombre de jours calendaires entre deux dates « jour » (b − a). */
export function diffDays(a: Date, b: Date): number {
  return Math.round((toDay(b).getTime() - toDay(a).getTime()) / DAY_MS);
}

export interface LeaveDaysInput {
  start: Date | string;
  end: Date | string;
  /** Jours ouvrés (0 = dimanche … 6 = samedi). Défaut : lundi → samedi. */
  workingDays?: number[];
  /** Jours fériés `YYYY-MM-DD`. */
  holidays?: string[];
  /** Premier jour pris l'après-midi seulement. */
  startHalfDay?: boolean;
  /** Dernier jour pris le matin seulement. */
  endHalfDay?: boolean;
}

/**
 * Nombre de jours de congé décomptés entre deux dates incluses :
 * jours ouvrés de l'établissement, hors jours fériés, avec demi-journées
 * éventuelles sur le premier et le dernier jour (s'ils sont ouvrés).
 * Une demande d'une seule journée marquée demi-journée vaut 0,5.
 */
export function computeLeaveDays(input: LeaveDaysInput): number {
  const start = toDay(input.start);
  const end = toDay(input.end);
  if (end.getTime() < start.getTime()) {
    throw new BadRequestException(
      'La date de fin doit être postérieure ou égale à la date de début',
    );
  }
  const working = new Set(input.workingDays ?? DEFAULT_WORKING_DAYS);
  const holidays = new Set(input.holidays ?? []);
  const isCounted = (day: Date) =>
    working.has(day.getUTCDay()) && !holidays.has(dayKey(day));

  let days = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    if (isCounted(new Date(t))) days += 1;
  }

  const sameDay = start.getTime() === end.getTime();
  if (sameDay) {
    if ((input.startHalfDay || input.endHalfDay) && isCounted(start)) {
      days -= 0.5;
    }
    return days;
  }
  if (input.startHalfDay && isCounted(start)) days -= 0.5;
  if (input.endHalfDay && isCounted(end)) days -= 0.5;
  return days;
}

/** Deux périodes de dates incluses se chevauchent-elles ? */
export function dateRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return (
    toDay(aStart).getTime() <= toDay(bEnd).getTime() &&
    toDay(bStart).getTime() <= toDay(aEnd).getTime()
  );
}

/** Minutes depuis minuit d'une heure `HH:mm`. */
export function timeToMinutes(time: string): number {
  if (!HOUR_MINUTE_REGEX.test(time)) {
    throw new BadRequestException(`Heure invalide (HH:mm attendu) : ${time}`);
  }
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export interface TimeInterval {
  start: Date;
  end: Date;
}

/**
 * Intervalle réel d'un créneau : si l'heure de fin est inférieure ou égale
 * à l'heure de début, le créneau se termine le lendemain (service de nuit).
 * Un créneau 00:00 → 00:00 dure donc 24 h.
 */
export function shiftInterval(
  date: Date | string,
  startTime: string,
  endTime: string,
): TimeInterval {
  const day = toDay(date).getTime();
  const startMin = timeToMinutes(startTime);
  let endMin = timeToMinutes(endTime);
  if (endMin <= startMin) endMin += 24 * 60;
  return {
    start: new Date(day + startMin * 60_000),
    end: new Date(day + endMin * 60_000),
  };
}

/** Durée en heures d'un créneau `HH:mm` → `HH:mm` (passage de minuit géré). */
export function shiftHours(startTime: string, endTime: string): number {
  const { start, end } = shiftInterval('2000-01-01', startTime, endTime);
  return round2((end.getTime() - start.getTime()) / HOUR_MS);
}

/** Chevauchement strict de deux intervalles semi-ouverts [start, end). */
export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return (
    a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime()
  );
}

/** Heures travaillées entre pointage d'entrée et de sortie (2 décimales). */
export function computeWorkedHours(checkIn: Date, checkOut: Date): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  if (Number.isNaN(ms) || ms < 0) {
    throw new BadRequestException('La sortie doit être postérieure à l’entrée');
  }
  return round2(ms / HOUR_MS);
}

/** Erreur Mongo de clé dupliquée (index unique). */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/** Solde de congé d'un type pour une année. */
export interface LeaveBalance {
  allocated: number;
  approved: number;
  pending: number;
  /** allocated − approved − pending */
  remaining: number;
}

export function computeLeaveBalance(
  allocated: number,
  approved: number,
  pending: number,
): LeaveBalance {
  return {
    allocated: round2(allocated),
    approved: round2(approved),
    pending: round2(pending),
    remaining: round2(allocated - approved - pending),
  };
}

/** Lève une 400 si le solde ne couvre pas `requested` jours. */
export function assertSufficientBalance(
  balance: LeaveBalance,
  requested: number,
): void {
  if (balance.remaining + 1e-9 < requested) {
    throw new BadRequestException(
      `Solde de congé insuffisant : ${balance.remaining} jour(s) disponible(s), ${requested} demandé(s)`,
    );
  }
}
