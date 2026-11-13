// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/organization/
// =============================================================================

import type { AddressEmbeddable, AuditableEntity, ContactEmbeddable } from "./base-entities";

export interface AddMemberDto {
  user_id: string;
  role_id?: string;
}

export interface AddressDto {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface ContactDto {
  name?: string;
  phone?: string;
  email?: string;
  position?: string;
}

export interface CreateOrganizationDto {
  name: string;
  code: string;
  type?: OrganizationType;
  description?: string;
  address?: AddressDto;
  contact?: ContactDto;
  logo_url?: string;
  website?: string;
  settings?: Record<string, unknown>;
  status?: OrganizationStatus;
  is_active?: boolean;
}

export type UpdateOrganizationDto = Partial<CreateOrganizationDto>;

/** Type d'organisation (chaîne hôtelière, groupe, établissement indépendant). */
export enum OrganizationType {
  CHAIN = "chain",
  GROUP = "group",
  INDEPENDENT = "independent",
}

/** Statut métier d'une organisation. */
export enum OrganizationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

/** Membre de l'organisation (sous-document embarqué). */
export interface OrganizationMember {
  user_id: string;
  role_id?: string;
  joined_at: string;
}

export interface Organization extends AuditableEntity {
  name: string;
  code: string;
  type: OrganizationType;
  description?: string;
  address?: AddressEmbeddable;
  contact?: ContactEmbeddable;
  logo_url?: string;
  website?: string;
  settings: Record<string, unknown>;
  status: OrganizationStatus;
  is_active: boolean;
  members: OrganizationMember[];
}
