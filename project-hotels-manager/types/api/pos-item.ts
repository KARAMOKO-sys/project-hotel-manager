// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/pos-item/
// =============================================================================

import type { AuditableEntity, MoneyEmbeddable } from "./base-entities";
import type { MoneyDto, PaginationQueryDto } from "./common";

/** Ajustement relatif du stock (positif = réapprovisionnement, négatif = sortie). */
export interface AdjustStockDto {
  delta: number;
  reason?: string;
}

/** Fixe le stock à une valeur absolue (inventaire physique). */
export interface SetStockDto {
  quantity: number;
}

export interface CreatePosItemDto {
  property_id: string;
  name: string;
  sku?: string;
  description?: string;
  category: PosCategory;
  price: MoneyDto;
  cost_price?: number;
  tax_rate?: number;
  track_stock?: boolean;
  stock_quantity?: number;
  low_stock_threshold?: number;
  unit?: string;
  is_active?: boolean;
  image_url?: string;
  metadata?: Record<string, unknown>;
}

/** Filtres de liste des articles POS. */
export interface PosItemQueryDto extends PaginationQueryDto {
  property_id?: string;
  category?: PosCategory;
  is_active?: boolean;
}

/** Le stock n'est pas modifiable par la mise à jour générique : utiliser les routes dédiées d'ajustement / d'inventaire. */
export type UpdatePosItemDto = Partial<Omit<CreatePosItemDto, "property_id" | "stock_quantity">>;

/** Catégories d'articles / points de vente (extras facturables). */
export enum PosCategory {
  BAR = "bar",
  RESTAURANT = "restaurant",
  MINIBAR = "minibar",
  SPA = "spa",
  ACTIVITY = "activity",
  LAUNDRY = "laundry",
  BOUTIQUE = "boutique",
  ROOM_SERVICE = "room_service",
  OTHER = "other",
}

/** Article vendable au point de vente (boisson, soin spa, activité, prestation de blanchisserie…), avec suivi de stock optionnel. */
export interface PosItem extends AuditableEntity {
  property_id: string;
  name: string;
  /** Référence interne (unique par établissement lorsqu'elle est renseignée). */
  sku?: string;
  description?: string;
  category: PosCategory;
  price: MoneyEmbeddable;
  /** Coût d'achat unitaire (pour le calcul de marge). */
  cost_price?: number;
  /** Taux de taxe applicable en pourcentage (ex : 18 pour 18 %). */
  tax_rate: number;
  /** Indique si le stock est suivi (faux pour les services : spa, activités…). */
  track_stock: boolean;
  stock_quantity: number;
  /** Seuil en dessous duquel une alerte de stock bas est levée. */
  low_stock_threshold: number;
  unit: string;
  is_active: boolean;
  image_url?: string;
  metadata: Record<string, unknown>;
}

/** Synthèse de l'état des stocks d'un établissement. */
export interface PosInventorySummary {
  property_id: string;
  total_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  stock_value: number;
  items: Array<PosItem & { is_low_stock: boolean }>;
}
