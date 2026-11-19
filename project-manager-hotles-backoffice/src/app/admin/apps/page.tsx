// src/app/admin/apps/page.tsx
// Magasin d'applications (à la manière d'Odoo) : installation et
// désinstallation des applications ERP pour l'établissement courant.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { errorMessage, useFeedback } from "@/components/ui/Feedback";

interface AppView {
  key: string;
  name: string;
  summary: string;
  category: string;
  category_label: string;
  icon: string;
  depends: string[];
  core: boolean;
  installed: boolean;
  blocking_dependents: string[];
}

export default function AppsPage() {
  const { organizationId, organization, refreshApps } = useWorkspace();
  const { notify, confirm } = useFeedback();
  const [apps, setApps] = useState<AppView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "installed" | "available">("all");

  const load = useCallback(async () => {
    if (!organizationId) {
      setApps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await apiFetch<AppView[]>(
        `/apps?organization_id=${encodeURIComponent(organizationId)}`,
      );
      setApps(Array.isArray(list) ? list : []);
    } catch (loadError) {
      setError(errorMessage(loadError, "Impossible de charger les applications"));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const nameOf = useCallback(
    (key: string) => apps.find((app) => app.key === key)?.name ?? key,
    [apps],
  );

  const categories = useMemo(() => {
    const visible = apps.filter((app) =>
      filter === "all" ? true : filter === "installed" ? app.installed : !app.installed,
    );
    const map = new Map<string, AppView[]>();
    visible.forEach((app) => {
      const label = app.category_label || app.category;
      map.set(label, [...(map.get(label) ?? []), app]);
    });
    return [...map.entries()];
  }, [apps, filter]);

  const installedCount = apps.filter((app) => app.installed).length;

  const install = async (app: AppView) => {
    const missing = app.depends.filter(
      (dep) => !apps.find((candidate) => candidate.key === dep)?.installed,
    );
    if (missing.length > 0) {
      const accepted = await confirm(
        `Installer « ${app.name} » installera aussi : ${missing.map(nameOf).join(", ")}. Continuer ?`,
        "Installation",
      );
      if (!accepted) return;
    }
    setBusyKey(app.key);
    try {
      const response = await apiFetch<{ installed?: string[] }>(
        `/apps/${encodeURIComponent(app.key)}/install?organization_id=${encodeURIComponent(organizationId)}`,
        { method: "POST" },
      );
      const installed = response?.installed ?? [];
      notify(
        "success",
        `${app.name} installée`,
        installed.length > 0
          ? `Applications installées : ${installed.map(nameOf).join(", ")}.`
          : "L’application était déjà installée.",
      );
      await Promise.all([load(), refreshApps()]);
    } catch (installError) {
      notify("error", "Installation impossible", errorMessage(installError));
    } finally {
      setBusyKey(null);
    }
  };

  const uninstall = async (app: AppView) => {
    const accepted = await confirm(
      `Désinstaller « ${app.name} » ? Ses menus disparaîtront ; les données déjà saisies sont conservées.`,
      "Désinstallation",
      true,
    );
    if (!accepted) return;
    setBusyKey(app.key);
    try {
      await apiFetch(
        `/apps/${encodeURIComponent(app.key)}/uninstall?organization_id=${encodeURIComponent(organizationId)}`,
        { method: "POST" },
      );
      notify("success", `${app.name} désinstallée`);
      await Promise.all([load(), refreshApps()]);
    } catch (uninstallError) {
      // 409 : d'autres applications installées en dépendent (message du serveur).
      notify("error", "Désinstallation refusée", errorMessage(uninstallError));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h2>
            <i className="pi pi-th-large"></i>Applications
          </h2>
          <p>
            {organization?.name ? `${organization.name} · ` : ""}
            {installedCount} application{installedCount > 1 ? "s" : ""} installée
            {installedCount > 1 ? "s" : ""} sur {apps.length}
          </p>
        </div>
        <div className="erp-toolbar">
          <div className="erp-tabs" role="tablist" aria-label="Filtrer les applications">
            {(
              [
                ["all", "Toutes"],
                ["installed", "Installées"],
                ["available", "Disponibles"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="rp-btn" onClick={() => void load()}>
            <i className="pi pi-refresh"></i> Actualiser
          </button>
        </div>
      </div>

      {!organizationId && (
        <div className="rp-info">
          <i className="pi pi-info-circle"></i>
          Sélectionnez un établissement dans l’en-tête pour gérer ses applications.
        </div>
      )}
      {error && (
        <div className="rp-alert" role="alert">
          <i className="pi pi-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="erp-empty">
          <i className="pi pi-spin pi-spinner"></i>Chargement des applications…
        </div>
      ) : categories.length === 0 ? (
        <div className="erp-empty">
          <i className="pi pi-inbox"></i>Aucune application.
        </div>
      ) : (
        categories.map(([category, list]) => (
          <section key={category}>
            <h3 className="erp-section-title">{category}</h3>
            <div className="erp-apps-grid">
              {list.map((app) => (
                <article
                  key={app.key}
                  className={`erp-app-card ${app.installed ? "installed" : ""}`}
                >
                  <div className="erp-app-head">
                    <div className="erp-app-icon">
                      <i className={app.icon || "pi pi-box"}></i>
                    </div>
                    <div>
                      <h3>{app.name}</h3>
                      <div className="erp-badges">
                        {app.installed && (
                          <span className="erp-badge success">
                            <i className="pi pi-check"></i> Installé
                          </span>
                        )}
                        {app.core && <span className="erp-badge muted">Socle</span>}
                      </div>
                    </div>
                  </div>
                  <p className="erp-app-summary">{app.summary}</p>
                  {app.depends.length > 0 && (
                    <p className="erp-app-deps">
                      <i className="pi pi-link"></i> Dépend de :{" "}
                      {app.depends.map(nameOf).join(", ")}
                    </p>
                  )}
                  {app.installed && app.blocking_dependents.length > 0 && (
                    <p className="erp-app-deps">
                      <i className="pi pi-lock"></i> Requise par :{" "}
                      {app.blocking_dependents.map(nameOf).join(", ")}
                    </p>
                  )}
                  {app.core ? (
                    <button type="button" className="rp-btn" disabled>
                      <i className="pi pi-lock"></i> Toujours installée
                    </button>
                  ) : app.installed ? (
                    <button
                      type="button"
                      className="rp-btn rp-btn-danger"
                      onClick={() => void uninstall(app)}
                      disabled={busyKey !== null}
                      title={
                        app.blocking_dependents.length > 0
                          ? `Désinstallez d’abord : ${app.blocking_dependents.map(nameOf).join(", ")}`
                          : undefined
                      }
                    >
                      <i
                        className={
                          busyKey === app.key ? "pi pi-spin pi-spinner" : "pi pi-trash"
                        }
                      ></i>
                      Désinstaller
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rp-btn rp-btn-primary"
                      onClick={() => void install(app)}
                      disabled={busyKey !== null}
                    >
                      <i
                        className={
                          busyKey === app.key ? "pi pi-spin pi-spinner" : "pi pi-download"
                        }
                      ></i>
                      Installer
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
