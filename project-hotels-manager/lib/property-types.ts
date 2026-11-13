// =============================================================================
// Libellés et icônes des types de propriété
// =============================================================================

import type { PropertyType } from "@/types";

export const PROPERTY_TYPE_META: Record<
  PropertyType,
  { label: string; icon: string }
> = {
  hotel: { label: "Hôtel", icon: "/img/icon-luxury.png" },
  residence: { label: "Résidence", icon: "/img/icon-condominium.png" },
  lodge: { label: "Lodge", icon: "/img/icon-neighborhood.png" },
  guest_house: { label: "Maison d'hôtes", icon: "/img/icon-house.png" },
  motel: { label: "Motel", icon: "/img/icon-housing.png" },
  apartment: { label: "Appartement", icon: "/img/icon-apartment.png" },
  house: { label: "Maison", icon: "/img/icon-house.png" },
  villa: { label: "Villa", icon: "/img/icon-villa.png" },
  studio: { label: "Studio", icon: "/img/icon-apartment.png" },
  commercial: { label: "Commercial", icon: "/img/icon-building.png" },
  land: { label: "Terrain", icon: "/img/icon-neighborhood.png" },
};

export const propertyTypeLabel = (type: PropertyType) =>
  PROPERTY_TYPE_META[type]?.label ?? type;
