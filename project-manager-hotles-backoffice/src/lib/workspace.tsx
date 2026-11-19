// src/lib/workspace.tsx
// Contexte « espace de travail » : établissement (organisation) et propriété
// courants, plus la liste des applications ERP installées pour
// l'établissement. Les sélections sont mémorisées dans localStorage.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, api } from "./api";
import type { Entity, Organization, Property } from "./types";

const ORGANIZATION_KEY = "pleasantstay.workspace.organization_id";
const PROPERTY_KEY = "pleasantstay.workspace.property_id";

function readStorage(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Stockage indisponible (navigation privée…) : sélection non mémorisée.
  }
}

export function entityId(entity: Entity | null | undefined): string {
  if (!entity) return "";
  return String(entity._id ?? entity.id ?? "");
}

/** Identifiant d'une référence (chaîne ou document peuplé). */
export function refId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj._id ?? obj.id ?? "");
  }
  return String(value);
}

export interface WorkspaceContextValue {
  organizations: Organization[];
  properties: Property[];
  organizationId: string;
  propertyId: string;
  organization: Organization | undefined;
  property: Property | undefined;
  setOrganizationId: (id: string) => void;
  setPropertyId: (id: string) => void;
  /** Clés des applications installées ; `null` tant qu'elles sont inconnues. */
  installedApps: string[] | null;
  isAppInstalled: (key?: string) => boolean;
  refreshApps: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [organizationId, setOrganizationIdState] = useState("");
  const [propertyId, setPropertyIdState] = useState("");
  const [installedApps, setInstalledApps] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Établissements accessibles.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await api.list<Organization>("/organizations", {
          page: 1,
          limit: 100,
        });
        if (cancelled) return;
        const list = result.data ?? [];
        setOrganizations(list);
        const stored = readStorage(ORGANIZATION_KEY);
        const selected =
          list.find((org) => entityId(org) === stored) ?? list[0];
        setOrganizationIdState(entityId(selected));
        if (!selected) setLoading(false);
        setError(null);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les établissements",
        );
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Propriétés de l'établissement choisi.
  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await api.list<Property>("/properties", {
          page: 1,
          limit: 100,
          organization_id: organizationId,
        });
        if (cancelled) return;
        // Le backend peut ignorer le filtre : on le réapplique côté client.
        const list = (result.data ?? []).filter((item) => {
          const owner = refId(item.organization_id);
          return !owner || owner === organizationId;
        });
        setProperties(list);
        const stored = readStorage(PROPERTY_KEY);
        const selected =
          list.find((item) => entityId(item) === stored) ?? list[0];
        const nextId = entityId(selected);
        setPropertyIdState(nextId);
        writeStorage(PROPERTY_KEY, nextId);
      } catch {
        if (!cancelled) {
          setProperties([]);
          setPropertyIdState("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const loadApps = useCallback(async (orgId: string) => {
    if (!orgId) {
      setInstalledApps(null);
      return;
    }
    try {
      const keys = await apiFetch<string[]>(
        `/apps/installed?organization_id=${encodeURIComponent(orgId)}`,
      );
      setInstalledApps(Array.isArray(keys) ? keys : null);
    } catch {
      // Applications inconnues (droits, backend indisponible) : on n'en masque aucune.
      setInstalledApps(null);
    }
  }, []);

  // 3. Applications installées.
  useEffect(() => {
    let cancelled = false;
    if (!organizationId) return;
    void (async () => {
      try {
        const keys = await apiFetch<string[]>(
          `/apps/installed?organization_id=${encodeURIComponent(organizationId)}`,
        );
        if (!cancelled) setInstalledApps(Array.isArray(keys) ? keys : null);
      } catch {
        if (!cancelled) setInstalledApps(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const setOrganizationId = useCallback((id: string) => {
    writeStorage(ORGANIZATION_KEY, id);
    writeStorage(PROPERTY_KEY, "");
    setPropertyIdState("");
    setProperties([]);
    setInstalledApps(null);
    setOrganizationIdState(id);
  }, []);

  const setPropertyId = useCallback((id: string) => {
    writeStorage(PROPERTY_KEY, id);
    setPropertyIdState(id);
  }, []);

  const refreshApps = useCallback(
    () => loadApps(organizationId),
    [loadApps, organizationId],
  );

  const isAppInstalled = useCallback(
    (key?: string) => !key || installedApps === null || installedApps.includes(key),
    [installedApps],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      organizations,
      properties,
      organizationId,
      propertyId,
      organization: organizations.find((org) => entityId(org) === organizationId),
      property: properties.find((item) => entityId(item) === propertyId),
      setOrganizationId,
      setPropertyId,
      installedApps,
      isAppInstalled,
      refreshApps,
      loading,
      error,
    }),
    [
      organizations,
      properties,
      organizationId,
      propertyId,
      setOrganizationId,
      setPropertyId,
      installedApps,
      isAppInstalled,
      refreshApps,
      loading,
      error,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

const FALLBACK: WorkspaceContextValue = {
  organizations: [],
  properties: [],
  organizationId: "",
  propertyId: "",
  organization: undefined,
  property: undefined,
  setOrganizationId: () => undefined,
  setPropertyId: () => undefined,
  installedApps: null,
  isAppInstalled: () => true,
  refreshApps: async () => undefined,
  loading: false,
  error: null,
};

export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext) ?? FALLBACK;
}
