// =============================================================================
// Service : propriétés (backend `/properties`)
// =============================================================================

import type {
  Paginated,
  Property,
  PropertyFilter,
  PropertyTypeCount,
  RoomType,
} from "@/types";
import { api } from "@/app/services/http/axios";

/** Liste paginée des propriétés actives correspondant au filtre. */
export async function getProperties(
  filter: PropertyFilter = {},
): Promise<Paginated<Property>> {
  const { data } = await api.get<Paginated<Property>>("/properties", {
    params: { ...filter, active: true },
  });
  return data;
}

/** Détail d'une propriété. */
export async function getPropertyById(id: string): Promise<Property> {
  const { data } = await api.get<Property>(`/properties/${id}`);
  return data;
}

/** Types de chambres d'une propriété (avec tarifs de base). */
export async function getPropertyRoomTypes(id: string): Promise<RoomType[]> {
  const { data } = await api.get<RoomType[]>(`/properties/${id}/room-types`);
  return data.filter((roomType) => roomType.is_active !== false);
}

/** Nombre de propriétés actives par type. */
export async function getPropertyTypeCounts(): Promise<PropertyTypeCount[]> {
  const { data } = await api.get<PropertyTypeCount[]>("/properties/stats/types");
  return data;
}

/** Villes où des propriétés sont disponibles. */
export async function getCities(): Promise<string[]> {
  const { data } = await api.get<string[]>("/properties/cities");
  return data;
}
