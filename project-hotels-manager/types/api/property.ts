// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/property/
// =============================================================================

import type { AddressEmbeddable, AuditableEntity, ContactEmbeddable, PropertyType } from "./base-entities";
import type { PaginationQueryDto } from "./common";

export interface CreatePropertyAddressDto {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface CreatePropertyContactDto {
  name?: string;
  phone?: string;
  email?: string;
}

export interface CreatePropertyDto {
  organization_id: string;
  owner_id?: string;
  name: string;
  code: string;
  type?: PropertyType;
  description?: string;
  star_rating?: number;
  address?: CreatePropertyAddressDto;
  contact?: CreatePropertyContactDto;
  amenities?: string[];
  images?: string[];
  check_in_time?: string;
  check_out_time?: string;
  settings?: Record<string, unknown>;
  status?: PropertyStatus;
  is_active?: boolean;
}

/** Paramètres de liste des propriétés : pagination + filtres métier. Exemple : `GET /properties?type=hotel&city=Abidjan&search=plaza&page=2` */
export interface PropertyQueryDto extends PaginationQueryDto {
  type?: PropertyType;
  /** Ville (insensible à la casse, correspondance partielle). */
  city?: string;
  /** Ne retourne que les propriétés actives (`is_active` + statut `active`). */
  active?: boolean;
}

export type UpdatePropertyDto = Partial<CreatePropertyDto>;

export enum PropertyStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  RENOVATION = "renovation",
  SUSPENDED = "suspended",
}

export interface Property extends AuditableEntity {
  organization_id: string;
  owner_id?: string;
  name: string;
  code: string;
  type: PropertyType;
  description?: string;
  star_rating?: number;
  address?: AddressEmbeddable;
  contact?: ContactEmbeddable;
  amenities: string[];
  images: string[];
  check_in_time?: string;
  check_out_time?: string;
  settings: Record<string, unknown>;
  status: PropertyStatus;
  is_active: boolean;
}
