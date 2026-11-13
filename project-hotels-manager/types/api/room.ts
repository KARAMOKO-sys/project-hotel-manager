// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/room/
// =============================================================================

import type { AuditableEntity, RoomStatus } from "./base-entities";

export interface CreateRoomDto {
  property_id: string;
  room_type_id: string;
  number: string;
  floor?: number;
  status?: RoomStatus;
  max_occupancy?: number;
  amenities?: string[];
  notes?: string;
  is_active?: boolean;
}

export type UpdateRoomDto = Partial<CreateRoomDto>;

export interface Room extends AuditableEntity {
  property_id: string;
  room_type_id: string;
  number: string;
  floor?: number;
  status: RoomStatus;
  max_occupancy?: number;
  amenities: string[];
  notes?: string;
  is_active: boolean;
}
