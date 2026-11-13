// =============================================================================
// Types partagés — alignés sur les schémas du backend (PleasantStay API)
// =============================================================================

/** Types de propriété (enum `PropertyType` du backend). */
export const PROPERTY_TYPES = [
  "hotel",
  "residence",
  "lodge",
  "guest_house",
  "motel",
  "apartment",
  "house",
  "villa",
  "studio",
  "commercial",
  "land",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export type PropertyStatus = "active" | "inactive" | "renovation" | "suspended";

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface Contact {
  name?: string;
  phone?: string;
  email?: string;
}

export interface Money {
  amount: number;
  currency?: string;
}

export interface Property {
  _id: string;
  organization_id: string;
  name: string;
  code: string;
  type: PropertyType;
  description?: string;
  star_rating?: number;
  address?: Address;
  contact?: Contact;
  amenities: string[];
  images: string[];
  check_in_time?: string;
  check_out_time?: string;
  status: PropertyStatus;
  is_active: boolean;
}

export interface RoomType {
  _id: string;
  property_id: string;
  name: string;
  code: string;
  description?: string;
  base_price: Money;
  capacity_adults?: number;
  capacity_children?: number;
  total_rooms?: number;
  bed_type?: string;
  size_sqm?: number;
  amenities: string[];
  images: string[];
  is_active: boolean;
}

/** Réponse paginée standard du backend (`PaginatedResult<T>`). */
export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/** Paramètres de `GET /properties`. */
export interface PropertyFilter {
  type?: PropertyType;
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/** Élément de `GET /properties/stats/types`. */
export interface PropertyTypeCount {
  type: PropertyType;
  count: number;
}

export interface Testimonial {
  id: number;
  name: string;
  profession: string;
  image: string;
  text: string;
}

export interface TeamMember {
  id: number;
  name: string;
  designation: string;
  image: string;
  delay: string;
  facebook: string;
  twitter: string;
  instagram: string;
}

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  property_id?: string;
}
