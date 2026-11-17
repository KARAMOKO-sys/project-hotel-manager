// src/lib/useApi.ts
// Hook de récupération de données avec repli automatique sur les données
// de démonstration quand le backend est indisponible.

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { DEMO_MODE } from "./config";
import { getMockList } from "./mock";
import type { Entity, PaginatedMeta } from "./types";

type QueryValue = string | number | boolean | undefined | null;
export type ListQuery = Record<string, QueryValue>;

const EMPTY_META: PaginatedMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

export interface UseApiListResult<T extends Entity> {
  data: T[];
  meta: PaginatedMeta;
  loading: boolean;
  error: string | null;
  usingFallback: boolean;
  refresh: () => void;
}

/**
 * Récupère une liste paginée depuis l'API.
 *
 * @param endpoint chemin de la ressource (ex. `/guests`)
 * @param fallbackKey clé des données de démo à utiliser en repli
 * @param query paramètres de pagination / recherche / tri
 */
export function useApiList<T extends Entity>(
  endpoint: string,
  fallbackKey: string,
  query: ListQuery = {},
): UseApiListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const queryKey = JSON.stringify(query);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.list<T>(endpoint, query as Record<string, QueryValue>);
      setData(res.data ?? []);
      setMeta(res.meta ?? EMPTY_META);
      setUsingFallback(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
      if (DEMO_MODE) {
        const fallback = getMockList<T>(fallbackKey, query);
        setData(fallback.data);
        setMeta(fallback.meta);
        setUsingFallback(true);
      } else {
        setData([]);
        setMeta(EMPTY_META);
        setUsingFallback(false);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, fallbackKey, queryKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, meta, loading, error, usingFallback, refresh: load };
}
