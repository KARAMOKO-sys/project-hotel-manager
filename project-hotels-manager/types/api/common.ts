// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/common/
// =============================================================================

import type { Currency } from "./base-entities";

/** DTO de paramètre d'URL pour les identifiants MongoDB. Permet de valider qu'un `:id` est bien un ObjectId Mongo valide avant même d'atteindre le service, renvoyant une erreur 400 si ce n'est pas le cas. */
export interface IdParamDto {
  id: string;
}

/** DTO réutilisable représentant un montant + une devise. Correspond au sous-document `MoneyEmbeddable` côté Mongoose. */
export interface MoneyDto {
  amount: number;
  currency?: Currency;
}

/** DTO de pagination et de tri réutilisable pour toutes les routes de liste. Il est attendu en `@Query()` et convertit automatiquement les chaînes de caractères de la requête HTTP en nombres grâce à `@Type(() => Number)`. */
export interface PaginationQueryDto {
  page?: number;
  limit?: number;
  /** Champ de tri au format MongoDB. Exemples : - `created_at` (croissant) - `-created_at` (décroissant) - `name` (croissant) */
  sort?: string;
  /** Terme de recherche libre (implémenté par les services qui le supportent). */
  search?: string;
}

/** Résultat paginé standard retourné par les routes de liste. `data` contient les documents de la page courante et `meta` les informations de navigation nécessaires au frontend. */
export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
}
