// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/role/
// =============================================================================


export interface CreateRoleDto {
  name: string;
  code: string;
  description?: string;
  role_level?: RoleLevel;
  is_system?: boolean;
  permissions?: string[];
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

export interface PermissionDto {
  permissions: string[];
}

export interface PermissionCheckResponseDto {
  has_all: boolean;
  has_any: boolean;
  granted: string[];
  missing: string[];
}

export interface RoleResponseDto {
  _id: string;
  name: string;
  code: string;
  description?: string;
  role_level: RoleLevel;
  is_system: boolean;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type UpdateRoleDto = Partial<CreateRoleDto>;

export enum RoleType {
  SUPER_ADMIN = "super_admin",
  OWNER = "owner",
  MANAGER = "manager",
  RECEPTIONIST = "receptionist",
  HOUSEKEEPING = "housekeeping",
  ACCOUNTANT = "accountant",
  GUEST = "guest",
  PARTNER = "partner",
  STAFF = "staff",
}

export enum RoleLevel {
  SYSTEM = 0,
  ADMIN = 1,
  MANAGEMENT = 2,
  STAFF = 3,
  EXTERNAL = 4,
}

export interface Role {
  /** Identifiant MongoDB. */
  _id: string;
  name: string;
  code: string;
  description?: string;
  role_level: RoleLevel;
  is_system: boolean;
  permissions: string[];
  metadata?: Record<string, unknown>;
  is_active: boolean;
}
