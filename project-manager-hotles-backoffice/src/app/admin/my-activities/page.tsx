// src/app/admin/my-activities/page.tsx
// Activités planifiées assignées à l'utilisateur connecté (appels, rendez-vous,
// relances…), groupées par échéance.

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDay } from "@/lib/format";
import type { Entity } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";
import { errorMessage, useFeedback } from "@/components/ui/Feedback";
import { ActionFormDialog } from "@/components/ui/FormControls";

interface Activity extends Entity {
  res_model?: string;
  res_id?: string;
  activity_type?: string;
  summary?: string;
  note?: string;
  due_date?: string;
  status?: string;
}

interface MyActivities {
  overdue: Activity[];
  today: Activity[];
  upcoming: Activity[];
  counts: { overdue: number; today: number; upcoming: number; total: number };
}

const TYPES: Record<string, { label: string; icon: string }> = {
  todo: { label: "À faire", icon: "pi pi-check-square" },
  call: { label: "Appel", icon: "pi pi-phone" },
  meeting: { label: "Rendez-vous", icon: "pi pi-users" },
  email: { label: "E-mail", icon: "pi pi-envelope" },
  follow_up: { label: "Relance", icon: "pi pi-replay" },
};

const MODELS: Record<string, string> = {
  Reservation: "Réservation",
  Guest: "Client",
  Room: "Chambre",
  Invoice: "Facture",
  Payment: "Paiement",
  PosTransaction: "Transaction point de vente",
  MaintenanceRequest: "Demande de maintenance",
  Housekeeping: "Tâche de ménage",
  Staff: "Employé",
  JournalEntry: "Écriture comptable",
  Product: "Article",
  PurchaseOrder: "Bon de commande",
  VendorBill: "Facture fournisseur",
  Lead: "Piste",
  LeaveRequest: "Demande de congé",
  LoyaltyAccount: "Compte fidélité",
};

const GROUPS: Array<{
  key: "overdue" | "today" | "upcoming";
  label: string;
  tone: string;
  icon: string;
}> = [
  { key: "overdue", label: "En retard", tone: "danger", icon: "pi pi-exclamation-circle" },
  { key: "today", label: "Aujourd’hui", tone: "warning", icon: "pi pi-sun" },
  { key: "upcoming", label: "À venir", tone: "info", icon: "pi pi-calendar" },
];

const idOf = (entity: Entity) => String(entity._id ?? entity.id ?? "");

export default function MyActivitiesPage() {
  const { propertyId } = useWorkspace();
  const { notify, confirm } = useFeedback();
  const [data, setData] = useState<MyActivities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allProperties, setAllProperties] = useState(false);
  const [doneTarget, setDoneTarget] = useState<Activity | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query =
        propertyId && !allProperties
          ? `?property_id=${encodeURIComponent(propertyId)}`
          : "";
      setData(await apiFetch<MyActivities>(`/activity/my-activities${query}`));
    } catch (loadError) {
      setError(errorMessage(loadError, "Impossible de charger vos activités"));
    } finally {
      setLoading(false);
    }
  }, [propertyId, allProperties]);

  useEffect(() => {
    void load();
  }, [load]);

  const markDone = async (activity: Activity, feedback?: string) => {
    try {
      await apiFetch(`/activity/activities/${idOf(activity)}/done`, {
        method: "POST",
        body: JSON.stringify(feedback ? { feedback } : {}),
      });
      notify("success", "Activité terminée", activity.summary);
      await load();
      return true;
    } catch (doneError) {
      notify("error", "Impossible de terminer l’activité", errorMessage(doneError));
      return false;
    }
  };

  const cancelActivity = async (activity: Activity) => {
    const accepted = await confirm(
      `Annuler l’activité « ${activity.summary ?? ""} » ?`,
      "Annulation",
      true,
    );
    if (!accepted) return;
    try {
      await apiFetch(`/activity/activities/${idOf(activity)}/cancel`, { method: "POST" });
      notify("success", "Activité annulée");
      await load();
    } catch (cancelError) {
      notify("error", "Annulation impossible", errorMessage(cancelError));
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h2>
            <i className="pi pi-check-circle"></i>Mes activités
          </h2>
          <p>
            {data
              ? `${data.counts.total} activité${data.counts.total > 1 ? "s" : ""} planifiée${data.counts.total > 1 ? "s" : ""}`
              : "Activités qui vous sont assignées"}
          </p>
        </div>
        <div className="erp-toolbar">
          <label style={{ flexDirection: "row", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={allProperties}
              onChange={(event) => setAllProperties(event.target.checked)}
              style={{ minHeight: 0 }}
            />
            Toutes les propriétés
          </label>
          <button type="button" className="rp-btn" onClick={() => void load()}>
            <i className={loading ? "pi pi-spin pi-spinner" : "pi pi-refresh"}></i>
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="rp-alert" role="alert" style={{ marginBottom: "1rem" }}>
          <i className="pi pi-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {data && (
        <div className="erp-kpis">
          {GROUPS.map((group) => (
            <div className="erp-kpi" key={group.key}>
              <span>{group.label}</span>
              <strong>{data.counts[group.key]}</strong>
            </div>
          ))}
        </div>
      )}

      {loading && !data ? (
        <div className="erp-empty">
          <i className="pi pi-spin pi-spinner"></i>Chargement…
        </div>
      ) : (
        data &&
        GROUPS.map((group) => {
          const items = data[group.key] ?? [];
          return (
            <section key={group.key}>
              <h3 className="erp-section-title">
                <i className={group.icon}></i>
                {group.label}
                <span className={`erp-badge ${group.tone}`}>{items.length}</span>
              </h3>
              <div className="erp-card" style={{ padding: 0 }}>
                {items.length === 0 ? (
                  <p className="erp-empty" style={{ padding: "1.25rem" }}>
                    Rien de prévu.
                  </p>
                ) : (
                  items.map((activity) => {
                    const type = TYPES[activity.activity_type ?? ""] ?? TYPES.todo;
                    return (
                      <div className="erp-activity" key={idOf(activity)}>
                        <div>
                          <h4>
                            <i className={type.icon}></i>
                            {activity.summary ?? type.label}
                          </h4>
                          <p>
                            {type.label} · échéance {formatDay(activity.due_date)}
                            {activity.res_model
                              ? ` · ${MODELS[activity.res_model] ?? activity.res_model}`
                              : ""}
                            {activity.res_id ? ` ${String(activity.res_id).slice(-6)}` : ""}
                          </p>
                          {activity.note && <p>{activity.note}</p>}
                        </div>
                        <div className="erp-activity-actions">
                          <button
                            type="button"
                            className="rp-btn rp-btn-primary"
                            onClick={() => setDoneTarget(activity)}
                          >
                            <i className="pi pi-check"></i> Marquer fait
                          </button>
                          <button
                            type="button"
                            className="rp-btn rp-btn-danger"
                            onClick={() => void cancelActivity(activity)}
                            title="Annuler l’activité"
                          >
                            <i className="pi pi-times"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })
      )}

      {doneTarget && (
        <ActionFormDialog
          title="Marquer comme fait"
          eyebrow={doneTarget.summary ?? "Activité"}
          fields={[
            {
              key: "feedback",
              label: "Compte rendu (facultatif)",
              type: "textarea",
              fullWidth: true,
            },
          ]}
          scope={{}}
          onCancel={() => setDoneTarget(null)}
          onSubmit={async (payload) => {
            const done = await markDone(
              doneTarget,
              typeof payload.feedback === "string" ? payload.feedback : undefined,
            );
            if (done) setDoneTarget(null);
            return done;
          }}
        />
      )}
    </div>
  );
}
