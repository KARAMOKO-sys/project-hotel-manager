// =============================================================================
// Hook : exécution d'une requête asynchrone (états loading / error)
// =============================================================================

"use client";

import { useEffect, useState, type DependencyList } from "react";

export interface UseAsyncResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
}

/**
 * Exécute `fetcher` au montage puis à chaque changement de `deps`.
 * Les réponses arrivant après un changement de dépendances sont ignorées.
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
  errorMessage = "Impossible de charger les données.",
): UseAsyncResult<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError(errorMessage);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // Les dépendances sont fournies explicitement par l'appelant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
