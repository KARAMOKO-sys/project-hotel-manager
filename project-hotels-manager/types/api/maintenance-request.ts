// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/maintenance-request/
// =============================================================================

import type { AuditableEntity, MaintenanceCategory, TaskPriority, TaskStatus } from "./base-entities";

export interface CreateMaintenanceRequestDto {
  property_id: string;
  room_id?: string;
  staff_id?: string;
  category?: MaintenanceCategory;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  equipment?: string;
  cost?: number;
}

export type UpdateMaintenanceRequestDto = Partial<CreateMaintenanceRequestDto>;

/** Demande de maintenance (plomberie, électricité, climatisation…). */
export interface MaintenanceRequest extends AuditableEntity {
  property_id: string;
  room_id?: string;
  staff_id?: string;
  category: MaintenanceCategory;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  equipment?: string;
  cost: number;
  resolution?: string;
  completed_at?: string;
  cancelled_reason?: string;
}
