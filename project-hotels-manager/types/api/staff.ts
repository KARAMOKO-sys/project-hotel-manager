// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/staff/
// =============================================================================

import type { AuditableEntity, MoneyEmbeddable } from "./base-entities";
import type { MoneyDto } from "./common";

/** Créneau hebdomadaire de travail. */
export interface StaffShiftDto {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  start: string;
  end: string;
}

/** Contact d'urgence de l'employé. */
export interface StaffEmergencyContactDto {
  name?: string;
  phone?: string;
  relationship?: string;
}

/** DTO de création d'une affectation (employé ↔ propriété). Le statut d'emploi démarre à « actif » ; il évolue ensuite via les routes dédiées (congé, suspension, départ...). */
export interface CreateStaffDto {
  user_id: string;
  user_type: StaffUserType;
  organization_id?: string;
  property_id: string;
  employee_code?: string;
  position: string;
  department?: StaffDepartment;
  employment_type?: EmploymentType;
  hire_date?: string;
  end_date?: string;
  manager_id?: string;
  schedule?: StaffShiftDto[];
  /** Ignoré si un planning est fourni (calculé automatiquement). */
  weekly_hours?: number;
  salary?: MoneyDto;
  emergency_contact?: StaffEmergencyContactDto;
  skills?: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
}

/** Corps des routes de changement de statut avec raison optionnelle. */
export interface StaffStatusReasonDto {
  reason?: string;
}

/** Corps de la route de fin de contrat. */
export interface TerminateStaffDto {
  reason: string;
  /** Date de départ (par défaut : aujourd'hui). */
  end_date?: string;
}

/** Corps de la route de mutation vers une autre propriété. */
export interface TransferStaffDto {
  property_id: string;
  organization_id?: string;
  position?: string;
  department?: StaffDepartment;
}

/** Corps de la route d'affectation d'un responsable. */
export interface AssignStaffManagerDto {
  manager_id: string;
}

/** Corps de la route de mise à jour du planning. */
export interface UpdateStaffScheduleDto {
  schedule: StaffShiftDto[];
}

/** DTO de mise à jour d'une affectation. L'utilisateur et la propriété ne sont pas modifiables ici : un changement de propriété passe par `PATCH /staff/:id/transfer`, et le responsable par `PATCH /staff/:id/manager`. */
export type UpdateStaffDto = Partial<Omit<CreateStaffDto, "user_id" | "user_type" | "property_id" | "organization_id" | "manager_id">>;

/** Type de compte utilisateur rattaché à l'affectation. Reprend les profils internes de `UserType` et ajoute les rôles sans collection dédiée (manager, maintenance). */
export enum StaffUserType {
  SUPER_ADMIN = "super_admin",
  OWNER = "owner",
  MANAGER = "manager",
  RECEPTIONIST = "receptionist",
  HOUSEKEEPING = "housekeeping",
  ACCOUNTANT = "accountant",
  MAINTENANCE = "maintenance",
  OTHER = "other",
}

/** Service (département) de l'établissement. */
export enum StaffDepartment {
  MANAGEMENT = "management",
  FRONT_OFFICE = "front_office",
  HOUSEKEEPING = "housekeeping",
  MAINTENANCE = "maintenance",
  ACCOUNTING = "accounting",
  FOOD_BEVERAGE = "food_beverage",
  SECURITY = "security",
  OTHER = "other",
}

/** Type de contrat. */
export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACT = "contract",
  INTERN = "intern",
  SEASONAL = "seasonal",
}

/** Statut de l'affectation. */
export enum EmploymentStatus {
  ACTIVE = "active",
  ON_LEAVE = "on_leave",
  SUSPENDED = "suspended",
  TERMINATED = "terminated",
}

/** Créneau hebdomadaire de travail (`HH:mm`, peut passer minuit). */
export interface StaffShift {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  start: string;
  end: string;
}

/** Contact à prévenir en cas d'urgence. */
export interface StaffEmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

/** Affectation d'un utilisateur interne (employé) à une propriété. Fait le lien entre un compte utilisateur (réceptionniste, ménage, comptable, manager...) et une propriété / organisation, avec les informations RH : poste, service, contrat, statut, planning et hiérarchie. Un utilisateur peut avoir plusieurs affectations (une par propriété). */
export interface Staff extends AuditableEntity {
  /** Compte utilisateur (collection dépendant de `user_type`). */
  user_id: string;
  user_type: StaffUserType;
  organization_id?: string;
  property_id: string;
  /** Matricule interne, unique par propriété. */
  employee_code?: string;
  position: string;
  department: StaffDepartment;
  employment_type: EmploymentType;
  employment_status: EmploymentStatus;
  /** Raison du dernier changement de statut (congé, suspension, départ). */
  status_reason?: string;
  status_changed_at?: string;
  hire_date: string;
  /** Date de fin de contrat / de départ. */
  end_date?: string;
  /** Responsable hiérarchique (autre affectation `Staff`). */
  manager_id?: string;
  schedule: StaffShift[];
  /** Heures hebdomadaires (calculées à partir du planning si fourni). */
  weekly_hours: number;
  salary?: MoneyEmbeddable;
  emergency_contact?: StaffEmergencyContact;
  skills: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
}

/** Effectifs d'une propriété. */
export interface StaffHeadcount {
  total: number;
  active: number;
  by_department: Record<string, number>;
  by_status: Record<string, number>;
}
