"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { BACKOFFICE_RESOURCES } from "./resources";

interface Metric {
  id: string;
  label: string;
  value: number | null;
  icon: string;
  error?: string;
}

const INITIAL_METRICS: Metric[] = [
  { id: "properties", label: "Établissements", value: null, icon: "pi-building" },
  { id: "reservations", label: "Réservations", value: null, icon: "pi-calendar" },
  { id: "guests", label: "Clients", value: null, icon: "pi-users" },
  { id: "rooms", label: "Chambres", value: null, icon: "pi-home" },
];

function countRecords(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Format de réponse inattendu");
  }
  const response = payload as { data?: unknown; meta?: { total?: unknown } };
  if (typeof response.meta?.total === "number") return response.meta.total;
  if (Array.isArray(response.data)) return response.data.length;
  throw new Error("Format de réponse inattendu");
}

export default function BackofficeDashboard() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);

  useEffect(() => {
    let active = true;
    Promise.all(
      INITIAL_METRICS.map(async (metric) => {
        try {
          const { data } = await apiClient.get<unknown>(
            `/${metric.id}`,
            { params: { page: 1, limit: 1 } },
          );
          return { ...metric, value: countRecords(data) };
        } catch (error) {
          return {
            ...metric,
            error:
              error instanceof Error
                ? error.message
                : "Données indisponibles",
          };
        }
      }),
    ).then((results) => {
      if (active) setMetrics(results);
    });
    return () => {
      active = false;
    };
  }, []);

  const featuredResources = ["reservations", "properties", "guests", "rooms"];

  return (
    <>
      <div className="bo-page-heading">
        <div>
          <span className="bo-eyebrow">PLEASANTSTAY · ADMINISTRATION</span>
          <h1>Vue d’ensemble</h1>
          <p>Suivez et gérez l’activité de votre plateforme hôtelière.</p>
        </div>
        <Link className="bo-button bo-button-primary" href="/backoffice/site">
          <i className="pi pi-palette" aria-hidden="true" />
          Personnaliser le site
        </Link>
      </div>

      <section aria-label="Indicateurs clés" className="bo-metric-grid">
        {metrics.map((metric) => (
          <article className="bo-metric-card" key={metric.id}>
            <span className="bo-metric-icon">
              <i className={`pi ${metric.icon}`} aria-hidden="true" />
            </span>
            <div>
              <p>{metric.label}</p>
              <strong>
                {metric.error
                  ? "—"
                  : metric.value === null
                    ? "…"
                    : metric.value.toLocaleString("fr-FR")}
              </strong>
              {metric.error && <small title={metric.error}>Donnée indisponible</small>}
            </div>
          </article>
        ))}
      </section>

      <section className="bo-panel">
        <div className="bo-panel-heading">
          <div>
            <h2>Accès rapide</h2>
            <p>Retrouvez les espaces les plus utilisés.</p>
          </div>
        </div>
        <div className="bo-quick-grid">
          {featuredResources.map((id) => {
            const resource = BACKOFFICE_RESOURCES.find((item) => item.id === id);
            if (!resource) return null;
            return (
              <Link
                className="bo-quick-link"
                href={`/backoffice/${resource.id}`}
                key={resource.id}
              >
                <span>{resource.label}</span>
                <i className="pi pi-arrow-up-right" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bo-panel bo-overview-panel">
        <div className="bo-panel-heading">
          <div>
            <h2>Espaces de gestion</h2>
            <p>{BACKOFFICE_RESOURCES.length} modules connectés à l’API.</p>
          </div>
          <Link href="/backoffice/properties">Gérer les établissements</Link>
        </div>
        <div className="bo-module-list">
          {BACKOFFICE_RESOURCES.map((resource) => (
            <Link
              className="bo-module-link"
              href={`/backoffice/${resource.id}`}
              key={resource.id}
            >
              {resource.label}
              <i className="pi pi-angle-right" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
