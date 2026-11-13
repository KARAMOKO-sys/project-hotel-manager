// =============================================================================
// Hooks : propriétés (backend)
// =============================================================================

"use client";

import type { PropertyFilter } from "@/types";
import {
  getCities,
  getProperties,
  getPropertyById,
  getPropertyRoomTypes,
  getPropertyTypeCounts,
} from "@/services/property.service";
import { useAsync } from "./useAsync";

/**
 * Charge une page de propriétés correspondant au filtre.
 * Relance la requête lorsque le filtre change (comparaison par valeur).
 */
export function useProperties(filter: PropertyFilter = {}) {
  const { data, loading, error } = useAsync(
    () => getProperties(filter),
    [JSON.stringify(filter)],
    "Impossible de charger les propriétés.",
  );
  return { properties: data?.data ?? [], meta: data?.meta, loading, error };
}

/** Charge une propriété et ses types de chambres. */
export function useProperty(id: string) {
  const { data, loading, error } = useAsync(
    () => Promise.all([getPropertyById(id), getPropertyRoomTypes(id)]),
    [id],
    "Propriété introuvable.",
  );
  return { property: data?.[0], roomTypes: data?.[1] ?? [], loading, error };
}

/** Nombre de propriétés par type. */
export function usePropertyTypeCounts() {
  const { data, loading, error } = useAsync(
    getPropertyTypeCounts,
    [],
    "Impossible de charger les catégories.",
  );
  return { typeCounts: data ?? [], loading, error };
}

/** Villes disponibles. */
export function useCities() {
  const { data, loading } = useAsync(getCities, []);
  return { cities: data ?? [], loading };
}
