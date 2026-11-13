// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/receptionist/
// =============================================================================

import type { User } from "./base-entities";

/** DTO de création d'un réceptionniste rattaché à une propriété. Le mot de passe est fourni en clair puis hashé par le service. */
export interface CreateReceptionistDto {
  email: string;
  password: string;
  property_id: string;
  employee_code: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  language?: string;
  timezone?: string;
  hire_date?: string;
  position?: string;
  can_modify_reservations?: boolean;
  can_override_prices?: boolean;
  /** Remise maximale (en %) que le réceptionniste peut accorder. */
  max_discount_percent?: number;
  can_check_in_out?: boolean;
  shift_schedule?: ShiftScheduleDto;
  shift_type?: ReceptionistShiftType;
  skills?: string[];
  preferences?: Record<string, unknown>;
}

/** Corps de la route de changement de mot de passe. */
export interface ChangeReceptionistPasswordDto {
  current_password: string;
  new_password: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export interface SuspendReceptionistDto {
  reason?: string;
}

/** Corps de la route de changement de statut (congé, inactif...). */
export interface SetReceptionistStatusDto {
  status: ReceptionistStatus;
}

/** Corps de la route de mise à jour du planning. */
export interface UpdateReceptionistScheduleDto {
  shift_schedule: ShiftScheduleDto;
  shift_type?: ReceptionistShiftType;
}

/** Corps de la route d'enregistrement d'une activité. */
export interface RecordReceptionistActivityDto {
  type: "reservation" | "checkin" | "checkout" | "cancellation";
  /** Durée de traitement en minutes (optionnelle). */
  handling_time?: number;
}

/** Corps de la route de notation de satisfaction. */
export interface SatisfactionScoreDto {
  score: number;
}

/** Créneau de travail d'une journée. */
export interface DayShiftDto {
  start: string;
  end: string;
}

/** Planning hebdomadaire d'un réceptionniste. */
export interface ShiftScheduleDto {
  monday?: DayShiftDto;
  tuesday?: DayShiftDto;
  wednesday?: DayShiftDto;
  thursday?: DayShiftDto;
  friday?: DayShiftDto;
  saturday?: DayShiftDto;
  sunday?: DayShiftDto;
}

/** DTO de mise à jour d'un réceptionniste. Le mot de passe est exclu : il se modifie via `PATCH /receptionists/:id/password`. */
export type UpdateReceptionistDto = Partial<Omit<CreateReceptionistDto, "password">>;

/** Statuts possibles d'un réceptionniste. */
export enum ReceptionistStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ON_LEAVE = "on_leave",
  SUSPENDED = "suspended",
}

/** Types de service (shift) d'un réceptionniste. */
export enum ReceptionistShiftType {
  MORNING = "morning",
  AFTERNOON = "afternoon",
  NIGHT = "night",
  FLEXIBLE = "flexible",
}

export interface Receptionist extends User {
  property_id: string;
  employee_code: string;
  hire_date?: string;
  position?: string;
  can_modify_reservations: boolean;
  can_override_prices: boolean;
  max_discount_percent: number;
  can_check_in_out: boolean;
  shift_schedule?: { monday?: { start: string; end: string }; tuesday?: { start: string; end: string }; wednesday?: { start: string; end: string }; thursday?: { start: string; end: string }; friday?: { start: string; end: string }; saturday?: { start: string; end: string }; sunday?: { start: string; end: string } };
  reservations_processed: number;
  satisfaction_score?: number;
  status?: ReceptionistStatus;
  shift_type?: ReceptionistShiftType;
  skills?: string[];
  total_checkins?: number;
  total_checkouts?: number;
  total_cancellations?: number;
  avg_handling_time?: number;
  preferences?: { notifications?: boolean; language?: string; theme?: string; dashboard_layout?: string };
  last_shift_start?: string;
  last_shift_end?: string;
}

/** Indicateurs de performance d'un réceptionniste. */
export interface ReceptionistPerformance {
  total_reservations: number;
  total_checkins: number;
  total_checkouts: number;
  total_cancellations: number;
  total_operations: number;
  cancellation_rate: number;
  avg_handling_time: null | number;
  satisfaction_score: null | number;
}
