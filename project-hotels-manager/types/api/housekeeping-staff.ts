// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/housekeeping-staff/
// =============================================================================

import type { User } from "./base-entities";

/** DTO de création d'un membre du personnel de ménage. Le mot de passe est fourni en clair puis hashé par le service. */
export interface CreateHousekeepingStaffDto {
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
  specialization?: SpecializationType;
  shift_start?: string;
  shift_end?: string;
  working_days?: string[];
  shift_type?: ShiftType;
  supervisor_name?: string;
  supervisor_id?: string;
  skills?: string[];
  certifications?: string[];
  /** Objectif mensuel de chambres nettoyées. */
  monthly_target?: number;
  assigned_equipment?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
}

/** Corps de la route de changement de mot de passe. */
export interface ChangeHousekeepingPasswordDto {
  current_password: string;
  new_password: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export interface SuspendHousekeepingStaffDto {
  reason?: string;
}

/** Corps de la route de changement de statut (congé, maladie...). */
export interface SetHousekeepingStatusDto {
  status: HousekeepingStatus;
}

/** Corps de la route de mise à jour des horaires de travail. */
export interface UpdateHousekeepingScheduleDto {
  shift_start: string;
  shift_end: string;
  working_days?: string[];
  shift_type?: ShiftType;
}

/** Corps de la route d'enregistrement d'un nettoyage de chambre. */
export interface RecordCleaningDto {
  room_id: string;
  room_number: string;
  /** Durée du nettoyage en minutes. */
  cleaning_time: number;
  quality_score?: number;
  issue_reported?: boolean;
  notes?: string;
}

/** Corps de la route de signalement d'un problème. */
export interface ReportIssueDto {
  room_id: string;
  room_number: string;
  issue_type: string;
  description: string;
}

/** Corps de la route de définition de l'objectif mensuel. */
export interface MonthlyTargetDto {
  monthly_target: number;
}

/** Corps de la route d'affectation d'un superviseur. */
export interface AssignSupervisorDto {
  supervisor_id: string;
  supervisor_name?: string;
}

/** DTO de mise à jour d'un membre du personnel de ménage. Le mot de passe est exclu : il se modifie via `PATCH /housekeeping-staff/:id/password`. */
export type UpdateHousekeepingStaffDto = Partial<Omit<CreateHousekeepingStaffDto, "password">>;

export enum HousekeepingStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ON_LEAVE = "on_leave",
  SICK = "sick",
  TRAINING = "training",
  SUSPENDED = "suspended",
}

export enum SpecializationType {
  ROOMS = "rooms",
  PUBLIC_AREAS = "public_areas",
  DEEP_CLEANING = "deep_cleaning",
  WINDOW_CLEANING = "window_cleaning",
  CARPET_CLEANING = "carpet_cleaning",
  LAUNDRY = "laundry",
  LINEN = "linen",
}

export enum ShiftType {
  MORNING = "morning",
  AFTERNOON = "afternoon",
  NIGHT = "night",
  FLEXIBLE = "flexible",
}

export interface HousekeepingStaff extends User {
  property_id: string;
  employee_code: string;
  hire_date?: string;
  specialization?: string;
  shift_start?: string;
  shift_end?: string;
  working_days?: string[];
  rooms_cleaned_today: number;
  rooms_cleaned_total: number;
  avg_cleaning_time?: number;
  quality_score?: number;
  assigned_equipment?: { vacuum_cleaner?: boolean; mop?: boolean; cleaning_cart?: boolean; linen_cart?: boolean; chemicals?: string[]; other?: string[] };
  status?: HousekeepingStatus;
  shift_type?: ShiftType;
  supervisor_name?: string;
  supervisor_id?: string;
  skills?: string[];
  certifications?: string[];
  total_tasks_completed?: number;
  total_issue_reports?: number;
  total_extra_hours?: number;
  attendance_rate?: number;
  monthly_target?: number;
  monthly_completed?: number;
  cleaning_history?: Array<{ date: string; room_id: string; room_number: string; cleaning_time: number; quality_score: number; issue_reported: boolean; notes?: string }>;
  preferences?: { notifications?: boolean; language?: string; theme?: string; mobile_app?: boolean; shift_preferences?: string[] };
  performance_metrics?: { avg_time_per_room?: number; quality_trend?: "improving" | "stable" | "declining"; completion_rate?: number; total_overtime?: number; total_leave_taken?: number; rating?: number };
}

/** Charge de travail d'un membre du personnel. */
export interface HousekeepingWorkload {
  rooms_cleaned_today: number;
  today_tasks: Array<{ room_number: string; time: number; quality: number }>;
  monthly_target: number;
  monthly_completed: number;
  monthly_remaining: number;
  monthly_progress: number;
}

/** Indicateurs de performance d'un membre du personnel. */
export interface HousekeepingPerformance {
  total_rooms: number;
  total_tasks: number;
  avg_cleaning_time: null | number;
  quality_score: null | number;
  total_issue_reports: number;
  issue_rate: number;
  attendance_rate: null | number;
  monthly_progress: number;
}
