// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/room-type/
// =============================================================================

import type { AuditableEntity, Currency, MoneyEmbeddable } from "./base-entities";

export interface CreateRoomTypeMoneyDto {
  amount: number;
  currency?: Currency;
}

export interface CreateRoomTypeDto {
  property_id: string;
  name: string;
  code: string;
  description?: string;
  base_price: CreateRoomTypeMoneyDto;
  capacity_adults?: number;
  capacity_children?: number;
  total_rooms?: number;
  bed_type?: string;
  size_sqm?: number;
  amenities?: string[];
  images?: string[];
  is_active?: boolean;
}

export type UpdateRoomTypeDto = Partial<CreateRoomTypeDto>;

export interface RoomType extends AuditableEntity {
  property_id: string;
  name: string;
  code: string;
  description?: string;
  base_price: MoneyEmbeddable;
  capacity_adults?: number;
  capacity_children?: number;
  total_rooms?: number;
  bed_type?: string;
  size_sqm?: number;
  amenities: string[];
  images: string[];
  is_active: boolean;
}
