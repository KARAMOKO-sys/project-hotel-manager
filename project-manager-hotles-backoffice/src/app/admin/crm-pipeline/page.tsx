// src/app/admin/crm-pipeline/page.tsx
// Pipeline commercial en colonnes (kanban) par étape, avec le CA pondéré.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, apiFetch } from "@/lib/api";
import { formatAmount, formatDay } from "@/lib/format";
import { refValue } from "@/lib/forms";
import type { Entity } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";
import { errorMessage, useFeedback } from "@/components/ui/Feedback";
import { ActionFormDialog } from "@/components/ui/FormControls";

interface Stage extends Entity {
  name?: string;
  sequence?: number;
  probability?: number;
  is_won?: boolean;
  is_lost?: boolean;
  fold?: boolean;
}

interface Lead extends Entity {
  reference?: string;
  title?: string;
  contact_name?: string;
  lead_type?: string;
  stage_id?: unknown;
  state?: string;
  expected_revenue?: number;
  probability?: number;
  currency?: string;
  arrival_date?: string;
  segment?: string;
}

interface PipelineReport {
  stages: Array<{
    stage_id: string;
    name: string;
    count: number;
    expected_revenue: number;
    weighted_revenue: number;
  }>;
  totals: {
    count: number;
    open_count: number;
    won_count: number;
    lost_count: number;
    expected_revenue: number;
    weighted_revenue: number;
    won_revenue: number;
  };
  win_rate: number;
}

const SEGMENTS: Record<string, string> = {
  group: "Groupe",
  seminar: "Séminaire",
  wedding: "Mariage",
  corporate_contract: "Contrat entreprise",
  long_stay: "Long séjour",
  individual: "Individuel",
};

const idOf = (entity: Entity) => String(entity._id ?? entity.id ?? "");

export default function CrmPipelinePage() {
  const { propertyId, property } = useWorkspace();
  const { notify, confirm } = useFeedback();
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipeline, setPipeline] = useState<PipelineReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyLead, setBusyLead] = useState<string | null>(null);
  const [lostMove, setLostMove] = useState<{ lead: Lead; stage: Stage } | null>(null);

  const load = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [stageResult, leadResult, report] = await Promise.all([
        api.list<Stage>("/crm/stages", { property_id: propertyId, page: 1, limit: 100 }),
        api.list<Lead>("/crm/leads", { property_id: propertyId, page: 1, limit: 100 }),
        apiFetch<PipelineReport>(
          `/crm/leads/pipeline?property_id=${encodeURIComponent(propertyId)}`,
        ).catch(() => null),
      ]);
      setStages(
        [...(stageResult.data ?? [])].sort(
          (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
        ),
      );
      setLeads(leadResult.data ?? []);
      setPipeline(report);
    } catch (loadError) {
      setError(errorMessage(loadError, "Impossible de charger le pipeline"));
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const leadsByStage = useMemo(() => {
    const map = new Map<string, Lead[]>();
    leads.forEach((lead) => {
      const stageId = refValue(lead.stage_id);
      map.set(stageId, [...(map.get(stageId) ?? []), lead]);
    });
    return map;
  }, [leads]);

  const stageStats = useMemo(
    () => new Map((pipeline?.stages ?? []).map((row) => [row.stage_id, row])),
    [pipeline],
  );

  const move = async (lead: Lead, stageId: string, lostReason?: string) => {
    setBusyLead(idOf(lead));
    try {
      await apiFetch(`/crm/leads/${idOf(lead)}/move`, {
        method: "POST",
        body: JSON.stringify(
          lostReason ? { stage_id: stageId, lost_reason: lostReason } : { stage_id: stageId },
        ),
      });
      const target = stages.find((stage) => idOf(stage) === stageId);
      notify("success", "Piste déplacée", target?.name ? `Nouvelle étape : ${target.name}` : undefined);
      await load();
      return true;
    } catch (moveError) {
      notify("error", "Déplacement impossible", errorMessage(moveError));
      return false;
    } finally {
      setBusyLead(null);
    }
  };

  const requestMove = async (lead: Lead, stageId: string) => {
    const stage = stages.find((item) => idOf(item) === stageId);
    if (!stage) return;
    if (stage.is_lost) {
      setLostMove({ lead, stage });
      return;
    }
    if (stage.is_won) {
      const accepted = await confirm(
        `Marquer « ${lead.title ?? lead.reference} » comme gagnée ?`,
        "Opportunité gagnée",
      );
      if (!accepted) return;
    }
    await move(lead, stageId);
  };

  const setupStages = async () => {
    if (!propertyId) return;
    try {
      await apiFetch("/crm/setup", {
        method: "POST",
        body: JSON.stringify({ property_id: propertyId }),
      });
      notify("success", "Pipeline initialisé");
      await load();
    } catch (setupError) {
      notify("error", "Initialisation impossible", errorMessage(setupError));
    }
  };

  const totals = pipeline?.totals;

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h2>
            <i className="pi pi-th-large"></i>Pipeline commercial
          </h2>
          <p>
            {property?.name ? `${property.name} · ` : ""}
            {leads.length} piste{leads.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="erp-toolbar">
          <Link href="/admin/crm-leads" className="rp-btn">
            <i className="pi pi-list"></i> Vue liste
          </Link>
          <button type="button" className="rp-btn" onClick={() => void load()}>
            <i className={loading ? "pi pi-spin pi-spinner" : "pi pi-refresh"}></i>
            Actualiser
          </button>
        </div>
      </div>

      {!propertyId && (
        <div className="rp-info">
          <i className="pi pi-info-circle"></i>
          Sélectionnez une propriété dans l’en-tête pour afficher son pipeline.
        </div>
      )}
      {error && (
        <div className="rp-alert" role="alert" style={{ marginBottom: "1rem" }}>
          <i className="pi pi-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {totals && (
        <div className="erp-kpis">
          <div className="erp-kpi">
            <span>Pistes ouvertes</span>
            <strong>{totals.open_count}</strong>
          </div>
          <div className="erp-kpi">
            <span>CA attendu</span>
            <strong>{formatAmount(totals.expected_revenue)}</strong>
          </div>
          <div className="erp-kpi">
            <span>CA pondéré</span>
            <strong>{formatAmount(totals.weighted_revenue)}</strong>
          </div>
          <div className="erp-kpi">
            <span>CA gagné</span>
            <strong>{formatAmount(totals.won_revenue)}</strong>
          </div>
          <div className="erp-kpi">
            <span>Taux de transformation</span>
            <strong>{(pipeline?.win_rate ?? 0).toLocaleString("fr-FR")} %</strong>
          </div>
        </div>
      )}

      {loading && stages.length === 0 ? (
        <div className="erp-empty">
          <i className="pi pi-spin pi-spinner"></i>Chargement…
        </div>
      ) : propertyId && stages.length === 0 ? (
        <div className="erp-card erp-empty">
          <i className="pi pi-sort-numeric-up"></i>
          <p>Aucune étape de pipeline pour cette propriété.</p>
          <button type="button" className="rp-btn rp-btn-primary" onClick={() => void setupStages()}>
            <i className="pi pi-bolt"></i> Créer les étapes par défaut
          </button>
        </div>
      ) : (
        <div className="erp-kanban">
          {stages.map((stage) => {
            const stageId = idOf(stage);
            const stageLeads = leadsByStage.get(stageId) ?? [];
            const stats = stageStats.get(stageId);
            return (
              <section className="erp-kanban-col" key={stageId}>
                <header>
                  <div>
                    <strong>{stage.name}</strong>{" "}
                    <span className="erp-badge muted">{stageLeads.length}</span>
                  </div>
                  <small>
                    {stats ? formatAmount(stats.weighted_revenue) : ""}
                    <br />
                    {stage.probability !== undefined ? `${stage.probability} %` : ""}
                  </small>
                </header>
                {stageLeads.length === 0 ? (
                  <p className="text-muted small text-center m-0 py-2">Aucune piste</p>
                ) : (
                  stageLeads.map((lead) => {
                    const leadId = idOf(lead);
                    return (
                      <article className="erp-lead" key={leadId}>
                        <h4>{lead.title ?? lead.reference ?? "Piste"}</h4>
                        <p>
                          {[lead.reference, lead.contact_name, lead.segment ? SEGMENTS[lead.segment] ?? lead.segment : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {lead.arrival_date && (
                          <p>
                            <i className="pi pi-calendar"></i> {formatDay(lead.arrival_date)}
                          </p>
                        )}
                        <div className="erp-lead-meta">
                          <span>{formatAmount(lead.expected_revenue, lead.currency ?? "XOF")}</span>
                          <span className={`erp-badge ${lead.state === "won" ? "success" : lead.state === "lost" ? "danger" : "info"}`}>
                            {lead.state === "won"
                              ? "Gagnée"
                              : lead.state === "lost"
                                ? "Perdue"
                                : `${lead.probability ?? 0} %`}
                          </span>
                        </div>
                        <select
                          aria-label={`Étape de ${lead.title ?? "la piste"}`}
                          value={stageId}
                          disabled={busyLead !== null}
                          onChange={(event) => void requestMove(lead, event.target.value)}
                        >
                          {stages.map((option) => (
                            <option key={idOf(option)} value={idOf(option)}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </article>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      )}

      {lostMove && (
        <ActionFormDialog
          title="Opportunité perdue"
          eyebrow={lostMove.lead.title ?? "Pipeline"}
          message={`Déplacer vers « ${lostMove.stage.name} » marque la piste comme perdue.`}
          fields={[{ key: "reason", label: "Motif de la perte", type: "text", required: true }]}
          scope={{}}
          onCancel={() => setLostMove(null)}
          onSubmit={async (payload) => {
            const done = await move(
              lostMove.lead,
              idOf(lostMove.stage),
              String(payload.reason ?? ""),
            );
            if (done) setLostMove(null);
            return done;
          }}
        />
      )}
    </div>
  );
}
