// src/lib/types.ts
// Types partagés pour les entités du backoffice hôtelier.
// Les noms de champs correspondent aux schémas Mongoose du backend
// project-hotels-manager-backend.

/**
 * Entité générique renvoyée par l'API NestJS/Mongoose.
 * Les documents MongoDB exposent `_id` ; on tolère aussi `id`.
 */
export interface Entity {
  _id?: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  [key: string]: unknown;
}

/** Méta-données de la réponse paginée standard (PaginatedResult). */
export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Réponse paginée standard du backend : { data, meta }. */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

/** Sous-document monétaire (MoneyEmbeddable). */
export interface Money {
  amount: number;
  currency: string;
}

export interface Organization extends Entity {
  name?: string;
  code?: string;
  type?: string;
  description?: string;
  website?: string;
  status?: string;
  is_active?: boolean;
  contact?: { email?: string; phone?: string; [key: string]: unknown };
  address?: { city?: string; country?: string; [key: string]: unknown };
}

export interface Property extends Entity {
  name?: string;
  code?: string;
  type?: string;
  star_rating?: number;
  status?: string;
  is_active?: boolean;
  organization_id?: string;
  address?: { city?: string; country?: string; [key: string]: unknown };
}

export interface Room extends Entity {
  number?: string;
  floor?: number;
  status?: string;
  max_occupancy?: number;
  room_type_id?: string;
  property_id?: string;
  is_active?: boolean;
}

export interface Guest extends Entity {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  guest_status?: string;
  loyalty_points?: number;
  loyalty_tier?: string;
  is_active?: boolean;
}

export interface Reservation extends Entity {
  confirmation_code?: string;
  guest_id?: string;
  property_id?: string;
  check_in?: string;
  check_out?: string;
  status?: string;
  adults?: number;
  children?: number;
  total_amount?: number | Money;
}

export interface Invoice extends Entity {
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  total_amount?: number;
  currency?: string;
  status?: string;
  reservation_id?: string;
}

export interface Payment extends Entity {
  payment_number?: string;
  amount?: Money;
  method?: string;
  status?: string;
  transaction_id?: string;
  paid_at?: string;
}

export interface HousekeepingTask extends Entity {
  room_id?: string;
  staff_id?: string;
  task_date?: string;
  status?: string;
  priority?: string;
}

export interface Campaign extends Entity {
  name?: string;
  type?: string;
  status?: string;
  scheduled_at?: string;
  recipient_count?: number;
}

export interface Role extends Entity {
  name?: string;
  code?: string;
  description?: string;
  permissions?: string[];
  role_level?: number;
  is_system?: boolean;
  is_active?: boolean;
}

/** Statistiques agrégées utilisées par le dashboard. */
export interface DashboardStats {
  organizations: number;
  properties: number;
  rooms: number;
  guests: number;
  reservations: number;
  invoices: number;
}
