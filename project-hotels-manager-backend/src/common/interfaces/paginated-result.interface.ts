/**
 * Résultat paginé standard retourné par les routes de liste.
 *
 * `data` contient les documents de la page courante et `meta` les
 * informations de navigation nécessaires au frontend.
 */
export interface PaginatedResult<T> {
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

/** Options de pagination internes partagées par les services. */
export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: string;
  search?: string;
}
