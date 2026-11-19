// src/components/ui/ResourcePage.tsx
// Page de liste générique : recherche, pagination, export CSV, création /
// modification / suppression, actions métier par ligne (workflow ERP) et
// filtrage par propriété ou établissement courant.
// Chaque module (clients, réservations, chambres…) est une mince enveloppe
// autour de ce composant.

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/lib/types";
import { api, apiFetch, type QueryValue } from "@/lib/api";
import {
  getResource,
  type BadgeTone,
  type ResourceColumn,
  type ResourceConfig,
  type ResourceField,
  type ResourceHeaderAction,
  type ResourceRowAction,
  type VisibleWhen,
} from "@/lib/resources";
import { useApiList } from "@/lib/useApi";
import { useWorkspace } from "@/lib/workspace";
import {
  FieldValueError,
  fromFormValue,
  getNestedValue,
  initialValues,
  labelFromSpec,
  loadOptions,
  refValue,
  setNestedValue,
  type FormValues,
} from "@/lib/forms";
import {
  ActionFormDialog,
  FieldControl,
  ResultDialog,
  useFieldOptions,
} from "@/components/ui/FormControls";
import { errorMessage, useFeedback } from "@/components/ui/Feedback";

const PAGE_SIZE = 10;

/* ------------------------------------------------------------------ */
/* Formatage des valeurs                                               */
/* ------------------------------------------------------------------ */

function getValue(row: Entity, key: string): unknown {
  return key.includes(".") ? getNestedValue(row, key) : row[key];
}

function formatName(row: Entity, key: string): string {
  const first = row.first_name;
  const last = row.last_name;
  if (first || last) return `${first ?? ""} ${last ?? ""}`.trim() || "—";

  const value = getValue(row, key);
  if (typeof value === "string") return value || "—";
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.number === "string") return `Chambre ${obj.number}`;
    if (obj.first_name || obj.last_name)
      return `${obj.first_name ?? ""} ${obj.last_name ?? ""}`.trim();
  }
  return "—";
}

function formatText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.number === "string") return obj.number;
    return JSON.stringify(value);
  }
  return String(value);
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: unknown, row?: Entity): string {
  if (value && typeof value === "object") {
    const obj = value as { amount?: number; currency?: string };
    const amount = obj.amount ?? 0;
    const currency = obj.currency ?? "EUR";
    try {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  }
  if (value === undefined || value === null || value === "") return "—";
  const num = Number(value);
  if (Number.isFinite(num)) {
    const currency = (row?.currency as string | undefined) ?? "EUR";
    try {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency,
      }).format(num);
    } catch {
      return `${num} ${currency}`;
    }
  }
  return "—";
}

function formatCount(value: unknown): string {
  if (Array.isArray(value)) return String(value.length);
  if (typeof value === "number") return value.toLocaleString("fr-FR");
  if (value === undefined || value === null) return "—";
  return String(value);
}

function defaultTone(value: unknown): BadgeTone {
  const s = String(value ?? "").toLowerCase();
  if (
    [
      "active",
      "available",
      "clean",
      "completed",
      "paid",
      "sent",
      "checked_in",
      "checked_out",
      "inspected",
      "normal",
      "online",
    ].includes(s)
  )
    return "success";
  if (
    [
      "pending",
      "issued",
      "scheduled",
      "sending",
      "in_progress",
      "dirty",
      "inspection",
      "overdue",
      "refunded",
      "high",
      "urgent",
      "renovation",
      "credit_note",
    ].includes(s)
  )
    return "warning";
  if (
    [
      "cancelled",
      "no_show",
      "failed",
      "blocked",
      "suspended",
      "skipped",
      "inactive",
      "maintenance",
    ].includes(s)
  )
    return "danger";
  if (
    [
      "confirmed",
      "occupied",
      "chain",
      "group",
      "independent",
      "hotel",
      "residence",
      "villa",
      "card",
      "mobile_money",
      "bank_transfer",
      "check",
      "email",
      "sms",
      "push",
      "offer",
    ].includes(s)
  )
    return "info";
  return "muted";
}

type RelationLabels = Record<string, Record<string, string>>;

function relationKey(column: ResourceColumn): string {
  return `${column.relationEndpoint ?? ""}#${column.relationLabel ?? ""}`;
}

function formatCell(
  row: Entity,
  column: ResourceColumn,
  relations: RelationLabels = {},
): string {
  const value = getValue(row, column.key);
  switch (column.format) {
    case "name":
      return formatName(row, column.key);
    case "date":
      return formatDate(value);
    case "datetime":
      return formatDateTime(value);
    case "money":
      return formatMoney(value, row);
    case "count":
      return formatCount(value);
    case "relation": {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return labelFromSpec(value as Record<string, unknown>, column.relationLabel);
      }
      const id = refValue(value);
      if (!id) return "—";
      return relations[relationKey(column)]?.[id] ?? `${id.slice(-6)}…`;
    }
    case "badge":
    case "boolean": {
      const raw = String(value ?? "—");
      return column.labels?.[raw] ?? raw;
    }
    default:
      return formatText(value);
  }
}

function cellTone(row: Entity, column: ResourceColumn): BadgeTone {
  const value = getValue(row, column.key);
  if (column.badgeMap) {
    return column.badgeMap[String(value)] ?? column.badgeDefault ?? defaultTone(value);
  }
  if (column.format === "boolean") {
    return value ? "success" : "muted";
  }
  return column.badgeDefault ?? defaultTone(value);
}

function matches(row: Entity, condition?: VisibleWhen): boolean {
  if (!condition) return true;
  const value = getValue(row, condition.key);
  return condition.in.includes(String(value ?? ""));
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("fr") + text.slice(1);
}

function rowId(row?: Entity): string {
  return String(row?._id ?? row?.id ?? "");
}

/** Champs saisis dans le formulaire (hors champs de portée automatiques). */
function formFields(resource: ResourceConfig, mode: "create" | "edit"): ResourceField[] {
  return resource.fields.filter((field) => {
    if (mode === "edit" && field.createOnly) return false;
    if (resource.propertyScoped && field.key === "property_id") return false;
    if (resource.organizationScoped && field.key === "organization_id") return false;
    return true;
  });
}

type PendingAction =
  | { kind: "row"; action: ResourceRowAction; row: Entity }
  | { kind: "header"; action: ResourceHeaderAction };

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export default function ResourcePage({ resourceKey }: { resourceKey: string }) {
  const resource = getResource(resourceKey);
  const { propertyId, organizationId, property, organization } = useWorkspace();
  const { notify, confirm } = useFeedback();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{
    mode: "create" | "edit";
    row?: Entity;
  } | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [initialFormValues, setInitialFormValues] = useState<FormValues>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; data: unknown } | null>(null);
  const [relations, setRelations] = useState<RelationLabels>({});

  const propertyScoped = Boolean(resource?.propertyScoped);
  const organizationScoped = Boolean(resource?.organizationScoped);
  const scopeMissing =
    (propertyScoped && !propertyId) || (organizationScoped && !organizationId);

  /** Filtres de portée transmis aux listes et aux options. */
  const scope = useMemo<Record<string, QueryValue>>(() => {
    const value: Record<string, QueryValue> = {};
    if (propertyScoped && propertyId) value.property_id = propertyId;
    if (organizationScoped && organizationId) value.organization_id = organizationId;
    return value;
  }, [propertyScoped, organizationScoped, propertyId, organizationId]);

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get(
      "search",
    );
    if (initialSearch) setSearch(initialSearch);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, meta, loading, error, usingFallback, refresh } = useApiList<Entity>(
    resource && !scopeMissing ? resource.endpoint : "",
    resourceKey,
    { page, limit: PAGE_SIZE, search: debouncedSearch, ...scope },
  );

  const totalPages = useMemo(() => meta?.totalPages ?? 1, [meta]);

  const activeFields = useMemo(
    () => (resource && dialog ? formFields(resource, dialog.mode) : []),
    [resource, dialog],
  );
  const optionsState = useFieldOptions(activeFields, Boolean(dialog), scope);

  // Libellés des colonnes « relation » (identifiant -> libellé).
  const relationColumns = useMemo(
    () =>
      (resource?.columns ?? []).filter(
        (column) => column.format === "relation" && column.relationEndpoint,
      ),
    [resource],
  );
  const relationSignature = JSON.stringify([
    relationColumns.map(relationKey),
    scope,
    data.length > 0,
  ]);
  useEffect(() => {
    if (relationColumns.length === 0 || data.length === 0) return;
    let cancelled = false;
    const seen = new Set<string>();
    void Promise.all(
      relationColumns.map(async (column) => {
        const key = relationKey(column);
        if (seen.has(key)) return;
        seen.add(key);
        try {
          const items = await loadOptions(
            column.relationEndpoint as string,
            column.relationLabel,
            undefined,
            scope,
          );
          if (cancelled) return;
          setRelations((current) => ({
            ...current,
            [key]: Object.fromEntries(items.map((item) => [item.value, item.label])),
          }));
        } catch {
          // Libellés indisponibles : l'identifiant abrégé reste affiché.
        }
      }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationSignature]);

  const canCreate =
    Boolean(resource) && !resource?.readOnly && resource?.createEnabled !== false;
  const canEdit = (row: Entity) =>
    Boolean(resource) &&
    !resource?.readOnly &&
    resource?.editEnabled !== false &&
    (resource?.fields.length ?? 0) > 0 &&
    matches(row, resource?.editableWhen);
  const canDelete = (row: Entity) =>
    Boolean(resource) &&
    !resource?.readOnly &&
    resource?.deleteEnabled !== false &&
    matches(row, resource?.deletableWhen) &&
    row[resource?.deleteProtectedKey ?? ""] !== true;

  const openCreateDialog = () => {
    if (!resource) return;
    setActionError(null);
    setFormError(null);
    const values = initialValues(formFields(resource, "create"));
    setFormValues(values);
    setInitialFormValues(values);
    setDialog({ mode: "create" });
  };

  const openEditDialog = (row: Entity) => {
    if (!resource) return;
    setActionError(null);
    setFormError(null);
    const values = initialValues(formFields(resource, "edit"), row);
    setFormValues(values);
    setInitialFormValues(values);
    setDialog({ mode: "edit", row });
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resource || !dialog) return;
    setFormError(null);

    const payload: Record<string, unknown> = {};
    try {
      formFields(resource, dialog.mode).forEach((field) => {
        const value = formValues[field.key];
        // En modification, seuls les champs changés sont envoyés (PATCH).
        if (
          dialog.mode === "edit" &&
          JSON.stringify(value) === JSON.stringify(initialFormValues[field.key])
        ) {
          return;
        }
        const converted = fromFormValue(field, value);
        if (converted === undefined) {
          if (dialog.mode === "edit" && field.type === "lines") {
            setNestedValue(payload, field.key, []);
          }
          return;
        }
        setNestedValue(payload, field.key, converted);
      });
    } catch (conversionError) {
      setFormError(
        conversionError instanceof FieldValueError
          ? conversionError.message
          : "Saisie invalide",
      );
      return;
    }

    if (dialog.mode === "create") {
      if (propertyScoped) {
        if (!propertyId) {
          setFormError("Sélectionnez une propriété dans l’en-tête avant d’enregistrer.");
          return;
        }
        payload.property_id = propertyId;
      }
      if (organizationScoped) {
        if (!organizationId) {
          setFormError("Sélectionnez un établissement dans l’en-tête avant d’enregistrer.");
          return;
        }
        payload.organization_id = organizationId;
      }
    }

    setSaving(true);
    try {
      if (dialog.mode === "create") {
        await api.create(resource.endpoint, payload);
        notify("success", `${capitalize(resource.singular)} créé(e)`);
      } else {
        const id = rowId(dialog.row);
        if (!id) throw new Error("Identifiant manquant pour cette ressource");
        if (Object.keys(payload).length > 0) {
          await api.update(`${resource.endpoint}/${id}${scopeSuffix()}`, payload);
        }
        notify("success", "Modifications enregistrées");
      }
      setDialog(null);
      refresh();
    } catch (saveError) {
      setFormError(errorMessage(saveError, "L’enregistrement a échoué"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Entity) => {
    if (!resource) return;
    const id = rowId(row);
    if (!id) {
      setActionError("Identifiant manquant : suppression impossible.");
      return;
    }
    const accepted = await confirm(
      `Supprimer cet élément de « ${resource.title} » ?`,
      "Suppression",
      true,
    );
    if (!accepted) return;

    setActionError(null);
    try {
      await api.remove(`${resource.endpoint}/${id}${scopeSuffix()}`);
      notify("success", "Élément supprimé");
      refresh();
    } catch (deleteError) {
      const message = errorMessage(deleteError, "La suppression a échoué");
      setActionError(message);
      notify("error", "Suppression impossible", message);
    }
  };

  /** `?organization_id=` pour les ressources rattachées à l'établissement. */
  function scopeSuffix(): string {
    return organizationScoped && organizationId
      ? `?organization_id=${encodeURIComponent(organizationId)}`
      : "";
  }

  /* ---------------------------- Actions --------------------------- */

  const sendAction = async (
    label: string,
    path: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
    options: { showResult?: boolean; successMessage?: string },
  ): Promise<boolean> => {
    setBusyAction(label);
    try {
      const response = await apiFetch<unknown>(path, {
        method,
        body: JSON.stringify(body),
      });
      notify("success", options.successMessage ?? `${label} : effectué`);
      if (options.showResult) setResult({ title: label, data: response });
      refresh();
      return true;
    } catch (actionFailure) {
      notify("error", `${label} : échec`, errorMessage(actionFailure));
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const rowActionPath = (action: ResourceRowAction, row: Entity) =>
    `${resource?.endpoint ?? ""}/${rowId(row)}/${action.endpoint}${scopeSuffix()}`;

  const actionFields = (action: ResourceRowAction): ResourceField[] => {
    if (action.fields?.length) return action.fields;
    if (typeof action.body === "string" && action.body.startsWith("prompt:")) {
      return [
        {
          key: "reason",
          label: action.body.slice("prompt:".length) || "Motif",
          type: "text",
          required: true,
        },
      ];
    }
    return [];
  };

  const runRowAction = async (action: ResourceRowAction, row: Entity) => {
    let body: Record<string, unknown> =
      action.body && typeof action.body === "object" ? { ...action.body } : {};
    if (action.buildBody) {
      const built = action.buildBody(row);
      if (typeof built === "string") {
        notify("warn", action.label, built);
        return;
      }
      body = { ...body, ...built };
    }
    if (actionFields(action).length > 0) {
      setPendingAction({ kind: "row", action, row });
      return;
    }
    if (action.confirm) {
      const accepted = await confirm(action.confirm, action.label, action.tone === "danger");
      if (!accepted) return;
    }
    await sendAction(
      action.label,
      rowActionPath(action, row),
      action.method === "patch" ? "PATCH" : "POST",
      body,
      action,
    );
  };

  const runHeaderAction = async (action: ResourceHeaderAction) => {
    if (action.includeProperty && !propertyId) {
      notify("warn", action.label, "Sélectionnez d’abord une propriété dans l’en-tête.");
      return;
    }
    if (action.fields?.length) {
      setPendingAction({ kind: "header", action });
      return;
    }
    if (action.confirm) {
      const accepted = await confirm(action.confirm, action.label);
      if (!accepted) return;
    }
    await sendAction(
      action.label,
      headerActionPath(action),
      "POST",
      action.includeProperty ? { property_id: propertyId } : {},
      action,
    );
  };

  function headerActionPath(action: ResourceHeaderAction): string {
    return organizationScoped && organizationId
      ? `${action.endpoint}?organization_id=${encodeURIComponent(organizationId)}`
      : action.endpoint;
  }

  const submitPendingAction = async (payload: Record<string, unknown>) => {
    if (!pendingAction) return false;
    let done: boolean;
    if (pendingAction.kind === "row") {
      const { action, row } = pendingAction;
      const base =
        action.body && typeof action.body === "object" ? action.body : {};
      const built = action.buildBody ? action.buildBody(row) : {};
      done = await sendAction(
        action.label,
        rowActionPath(action, row),
        action.method === "patch" ? "PATCH" : "POST",
        { ...base, ...(typeof built === "object" ? built : {}), ...payload },
        action,
      );
    } else {
      const { action } = pendingAction;
      done = await sendAction(
        action.label,
        headerActionPath(action),
        "POST",
        { ...(action.includeProperty ? { property_id: propertyId } : {}), ...payload },
        action,
      );
    }
    if (done) setPendingAction(null);
    return done;
  };

  if (!resource) {
    return (
      <div className="alert alert-warning">
        Ressource inconnue : <code>{resourceKey}</code>
      </div>
    );
  }

  const exportCsv = () => {
    if (!data.length) return;
    const headers = resource.columns.map((c) => c.label).join(";");
    const rows = data.map((row) =>
      resource.columns
        .map((c) => formatCell(row, c, relations).replace(/;/g, ","))
        .join(";"),
    );
    const csv = `﻿${[headers, ...rows].join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resourceKey}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const scopeLabel = propertyScoped
    ? property?.name
    : organizationScoped
      ? organization?.name
      : undefined;

  return (
    <div className="resource-page">
      {/* En-tête */}
      <div className="resource-header">
        <div>
          <h2 className="resource-title">
            <i className={`${resource.icon} me-2`}></i>
            {resource.title}
          </h2>
          <p className="resource-subtitle">
            {meta.total.toLocaleString("fr-FR")} {resource.singular}
            {meta.total > 1 ? "s" : ""} au total
            {scopeLabel ? ` · ${scopeLabel}` : ""}
          </p>
          {resource.description && (
            <p className="rp-description">{resource.description}</p>
          )}
        </div>
        <div className="resource-actions">
          {resource.headerActions?.map((action) => (
            <button
              key={action.label}
              className="btn-action"
              onClick={() => void runHeaderAction(action)}
              disabled={busyAction !== null || scopeMissing}
              title={action.label}
            >
              <i
                className={
                  busyAction === action.label ? "pi pi-spin pi-spinner" : action.icon
                }
              ></i>
              <span>{action.label}</span>
            </button>
          ))}
          {canCreate && (
            <button
              className="btn-action btn-primary-action"
              onClick={openCreateDialog}
              disabled={scopeMissing}
            >
              <i className="pi pi-plus"></i>
              <span>Ajouter</span>
            </button>
          )}
          <button className="btn-action" onClick={refresh} title="Actualiser">
            <i className="pi pi-refresh"></i>
            <span>Actualiser</span>
          </button>
          <button
            className="btn-action btn-primary-action"
            onClick={exportCsv}
            title="Exporter en CSV"
          >
            <i className="pi pi-download"></i>
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {scopeMissing && (
        <div className="demo-banner">
          <i className="pi pi-info-circle"></i>
          <span>
            {propertyScoped
              ? "Sélectionnez une propriété dans l’en-tête pour afficher ces données."
              : "Sélectionnez un établissement dans l’en-tête pour afficher ces données."}
          </span>
        </div>
      )}

      {/* Bandeau mode démo */}
      {usingFallback && (
        <div className="demo-banner">
          <i className="pi pi-info-circle"></i>
          <span>
            Backend indisponible — données de démonstration affichées.
          </span>
        </div>
      )}
      {error && !usingFallback && (
        <div className="resource-error" role="alert">
          <i className="pi pi-exclamation-triangle"></i>
          <span>Erreur API : {error}</span>
          <button onClick={refresh}>Réessayer</button>
        </div>
      )}
      {actionError && (
        <div className="resource-error" role="alert">
          <i className="pi pi-exclamation-triangle"></i>
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} aria-label="Fermer">
            <i className="pi pi-times"></i>
          </button>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="search-bar">
        <div className="search-input-wrap">
          <i className="pi pi-search"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={resource.searchPlaceholder ?? "Rechercher…"}
          />
          {search && (
            <button
              className="search-clear"
              onClick={() => setSearch("")}
              aria-label="Effacer"
            >
              <i className="pi pi-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="table-wrap">
        <table className="rs-table">
          <thead>
            <tr>
              {resource.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th className="actions-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={resource.columns.length + 1} className="empty-cell">
                  <div className="loading-row">
                    <div className="spinner-circle-sm"></div>
                    <span>Chargement…</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={resource.columns.length + 1} className="empty-cell">
                  <i className="pi pi-inbox empty-icon"></i>
                  <p>Aucun résultat</p>
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const visibleActions = (resource.rowActions ?? []).filter((action) =>
                  matches(row, action.visibleWhen),
                );
                const editable = canEdit(row);
                return (
                  <tr key={String(row._id ?? row.id ?? index)}>
                    {resource.columns.map((column) => (
                      <td key={column.key}>
                        {column.format === "badge" ||
                        column.format === "boolean" ? (
                          <span className={`badge tone-${cellTone(row, column)}`}>
                            {column.format === "boolean"
                              ? getValue(row, column.key)
                                ? "Oui"
                                : "Non"
                              : formatCell(row, column, relations)}
                          </span>
                        ) : (
                          formatCell(row, column, relations)
                        )}
                      </td>
                    ))}
                    <td className="actions-cell">
                      {visibleActions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          className={`rp-row-btn ${action.tone ? `rp-row-btn-${action.tone}` : ""}`}
                          onClick={() => void runRowAction(action, row)}
                          disabled={busyAction !== null}
                          title={action.label}
                        >
                          <i className={action.icon}></i>
                          <span>{action.label}</span>
                        </button>
                      ))}
                      {editable ? (
                        <button
                          className="row-action"
                          onClick={() => openEditDialog(row)}
                          aria-label={`Modifier ${resource.singular}`}
                          title="Modifier"
                        >
                          <i className="pi pi-pencil"></i>
                        </button>
                      ) : (
                        <button
                          className="row-action"
                          onClick={() =>
                            setResult({ title: `Détail : ${resource.singular}`, data: row })
                          }
                          aria-label={`Voir ${resource.singular}`}
                          title="Voir le détail"
                        >
                          <i className="pi pi-eye"></i>
                        </button>
                      )}
                      {canDelete(row) && (
                        <button
                          className="row-action row-action-danger"
                          onClick={() => void handleDelete(row)}
                          aria-label={`Supprimer ${resource.singular}`}
                          title="Supprimer"
                        >
                          <i className="pi pi-trash"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button
            className="page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <i className="pi pi-angle-left"></i> Précédent
          </button>
          <span className="page-info">
            Page {page} sur {totalPages}
          </span>
          <button
            className="page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant <i className="pi pi-angle-right"></i>
          </button>
        </div>
      )}

      {dialog && (
        <div
          className="resource-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setDialog(null);
            }
          }}
        >
          <section
            className={`resource-dialog ${activeFields.some((field) => field.type === "lines" || field.type === "json") ? "rp-dialog-wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-dialog-title"
          >
            <div className="dialog-header">
              <div>
                <p className="dialog-eyebrow">{resource.title}</p>
                <h3 id="resource-dialog-title">
                  {dialog.mode === "create"
                    ? `Ajouter ${resource.singular}`
                    : `Modifier ${resource.singular}`}
                </h3>
              </div>
              <button
                className="row-action"
                onClick={() => setDialog(null)}
                disabled={saving}
                aria-label="Fermer"
              >
                <i className="pi pi-times"></i>
              </button>
            </div>

            <form onSubmit={handleSave}>
              {dialog.mode === "create" && scopeLabel && (
                <p className="rp-modal-message">
                  <i className="pi pi-building"></i>{" "}
                  {propertyScoped ? "Propriété" : "Établissement"} : <strong>{scopeLabel}</strong>
                </p>
              )}
              <div className="rp-fields">
                {activeFields.map((field) => (
                  <FieldControl
                    key={field.key}
                    field={field}
                    value={formValues[field.key]}
                    onChange={(value) =>
                      setFormValues((current) => ({ ...current, [field.key]: value }))
                    }
                    optionsState={optionsState}
                    idPrefix={resource.key}
                  />
                ))}
              </div>
              {formError && (
                <div className="resource-error dialog-error" role="alert">
                  <i className="pi pi-exclamation-triangle"></i>
                  <span>{formError}</span>
                </div>
              )}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => setDialog(null)}
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-action btn-primary-action"
                  disabled={saving}
                >
                  <i className={saving ? "pi pi-spin pi-spinner" : "pi pi-check"}></i>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {pendingAction && (
        <ActionFormDialog
          title={pendingAction.action.label}
          eyebrow={resource.title}
          message={pendingAction.action.confirm}
          fields={
            pendingAction.kind === "row"
              ? actionFields(pendingAction.action)
              : pendingAction.action.fields ?? []
          }
          scope={propertyId ? { ...scope, property_id: propertyId } : scope}
          onCancel={() => setPendingAction(null)}
          onSubmit={submitPendingAction}
        />
      )}

      {result && (
        <ResultDialog
          title={result.title}
          data={result.data}
          onClose={() => setResult(null)}
        />
      )}

      <style jsx>{`
        .resource-page {
          animation: fadeIn 0.4s ease;
        }
        .resource-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }
        .resource-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          display: flex;
          align-items: center;
        }
        .resource-title i {
          color: var(--ps-primary);
        }
        .resource-subtitle {
          margin: 0.25rem 0 0;
          color: #6b7280;
          font-size: 0.85rem;
        }
        .resource-actions {
          display: flex;
          gap: 0.5rem;
        }
        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1rem;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #374151;
          font-weight: 500;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-action:hover {
          border-color: var(--ps-primary);
          color: var(--ps-primary);
        }
        .btn-primary-action {
          background: var(--ps-primary);
          border-color: var(--ps-primary);
          color: #fff;
        }
        .btn-primary-action:hover {
          background: var(--ps-primary-hover);
          color: #fff;
        }
        .demo-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
          padding: 0.65rem 1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }
        .search-bar {
          margin-bottom: 1rem;
        }
        .search-input-wrap {
          position: relative;
          max-width: 420px;
        }
        .search-input-wrap > i {
          position: absolute;
          left: 0.9rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .search-input-wrap input {
          width: 100%;
          padding: 0.6rem 2.5rem 0.6rem 2.4rem;
          border: 1px solid #e5e7eb;
          border-radius: 50px;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          background: #fff;
        }
        .search-input-wrap input:focus {
          outline: none;
          border-color: var(--ps-primary);
          box-shadow: 0 0 0 3px rgba(var(--ps-primary-rgb), 0.12);
        }
        .search-clear {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: #e5e7eb;
          color: #6b7280;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .table-wrap {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.04);
          overflow-x: auto;
        }
        .rs-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }
        .rs-table th {
          text-align: left;
          padding: 0.85rem 1.25rem;
          background: #f8f9fa;
          color: #374151;
          font-weight: 600;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          border-bottom: 1px solid #e5e7eb;
        }
        .rs-table td {
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          color: #4b5563;
          font-size: 0.9rem;
        }
        .rs-table tbody tr {
          transition: background 0.15s ease;
        }
        .rs-table tbody tr:hover {
          background: #f8faf9;
        }
        .rs-table tbody tr:last-child td {
          border-bottom: none;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.7rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .tone-success {
          background: rgba(var(--ps-primary-rgb), 0.12);
          color: var(--ps-primary-dark);
        }
        .tone-warning {
          background: rgba(245, 158, 11, 0.14);
          color: #b45309;
        }
        .tone-danger {
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
        }
        .tone-info {
          background: rgba(59, 130, 246, 0.12);
          color: #1d4ed8;
        }
        .tone-muted {
          background: rgba(107, 114, 128, 0.12);
          color: #4b5563;
        }
        .empty-cell {
          text-align: center;
          padding: 3rem 1rem !important;
          color: #9ca3af;
        }
        .empty-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.5rem;
        }
        .loading-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: #6b7280;
        }
        .spinner-circle-sm {
          width: 18px;
          height: 18px;
          border: 2px solid #e5e7eb;
          border-top-color: var(--ps-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.25rem;
        }
        .page-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.45rem 0.9rem;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #374151;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .page-btn:hover:not(:disabled) {
          border-color: var(--ps-primary);
          color: var(--ps-primary);
        }
        .page-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .page-info {
          color: #6b7280;
          font-size: 0.85rem;
        }
        .actions-heading {
          text-align: right !important;
          width: 112px;
        }
        .actions-cell {
          text-align: right;
          white-space: nowrap;
        }
        .row-action {
          width: 34px;
          height: 34px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          color: #475569;
          cursor: pointer;
          margin-left: 0.35rem;
        }
        .row-action:hover:not(:disabled) {
          border-color: var(--ps-primary-hover);
          color: var(--ps-primary-dark);
        }
        .row-action-danger:hover:not(:disabled) {
          border-color: #ef4444;
          color: #b91c1c;
        }
        .resource-error {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fef2f2;
          color: #991b1b;
          font-size: 0.88rem;
        }
        .resource-error span {
          flex: 1;
        }
        .resource-error button {
          border: 0;
          background: transparent;
          color: inherit;
          font-weight: 600;
        }
        .resource-dialog-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: grid;
          place-items: center;
          padding: 1rem;
          background: rgb(15 23 42 / 0.48);
          backdrop-filter: blur(3px);
        }
        .resource-dialog {
          width: min(100%, 680px);
          max-height: min(90vh, 820px);
          overflow-y: auto;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 24px 80px rgb(15 23 42 / 0.2);
        }
        .dialog-header,
        .dialog-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .dialog-header {
          margin-bottom: 1.25rem;
        }
        .dialog-eyebrow {
          margin: 0 0 0.2rem;
          color: var(--ps-primary-dark);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .dialog-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 700;
        }
        .dialog-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .dialog-field {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 0.4rem;
          color: #374151;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .dialog-field b {
          color: #dc2626;
        }
        .dialog-field input:not([type="checkbox"]),
        .dialog-field select {
          width: 100%;
          min-height: 42px;
          padding: 0.55rem 0.7rem;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: #fff;
          color: #1f2937;
          font: inherit;
        }
        .dialog-field input:focus,
        .dialog-field select:focus {
          outline: 2px solid rgb(34 197 94 / 0.25);
          border-color: var(--ps-primary-hover);
        }
        .dialog-checkbox {
          flex-direction: row;
          align-items: center;
          align-self: end;
          min-height: 42px;
        }
        .dialog-checkbox input {
          width: 18px;
          height: 18px;
          accent-color: var(--ps-primary-hover);
        }
        .field-error {
          color: #b91c1c;
          font-weight: 400;
        }
        .dialog-error {
          margin: 1rem 0 0;
        }
        .dialog-actions {
          justify-content: flex-end;
          margin-top: 1.5rem;
        }
        @media (max-width: 640px) {
          .resource-actions {
            width: 100%;
            flex-wrap: wrap;
          }
          .btn-action {
            flex: 1;
            justify-content: center;
            padding-inline: 0.65rem;
          }
          .dialog-fields {
            grid-template-columns: 1fr;
          }
          .resource-dialog {
            padding: 1.1rem;
          }
          .pagination-bar {
            gap: 0.5rem;
          }
          .page-btn {
            padding: 0.45rem 0.6rem;
            font-size: 0.78rem;
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
