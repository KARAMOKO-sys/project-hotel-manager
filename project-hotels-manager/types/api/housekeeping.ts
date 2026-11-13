// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/housekeeping/
// =============================================================================

import type { AuditableEntity, TaskPriority, TaskStatus } from "./base-entities";

export interface CreateHousekeepingDto {
  property_id: string;
  room_id: string;
  staff_id?: string;
  task_date: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  description?: string;
  notes?: string;
  photos?: string[];
}

export type UpdateHousekeepingDto = Partial<CreateHousekeepingDto>;

/** Tâche de ménage associée à une chambre. */
export interface Housekeeping extends AuditableEntity {
  property_id: string;
  room_id: string;
  staff_id?: string;
  task_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  description?: string;
  notes?: string;
  photos: string[];
  completed_at?: string;
  skipped_reason?: string;
}
