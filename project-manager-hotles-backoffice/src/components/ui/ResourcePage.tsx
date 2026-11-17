// src/components/ui/ResourcePage.tsx
// Page de liste générique : recherche, pagination, tri visuel et export CSV.
// Chaque module (clients, réservations, chambres…) est une mince enveloppe
// autour de ce composant.

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/lib/types";
import { api } from "@/lib/api";
import {
  getResource,
  type BadgeTone,
  type ResourceColumn,
} from "@/lib/resources";
import type { ResourceField } from "@/lib/resources";
import { useApiList } from "@/lib/useApi";

const PAGE_SIZE = 10;

/* ------------------------------------------------------------------ */
/* Formatage des valeurs                                               */
/* ------------------------------------------------------------------ */

function getValue(row: Entity, key: string): unknown {
  return row[key];
}

function getNestedValue(row: Entity, key: string): unknown {
  return key.split(".").reduce<unknown>((value, part) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[part];
  }, row);
}

function setNestedValue(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  const parts = key.split(".");
  let current = target;
  parts.slice(0, -1).forEach((part) => {
    const next = current[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  });
  current[parts[parts.length - 1]] = value;
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

function formatCell(row: Entity, column: ResourceColumn): string {
  switch (column.format) {
    case "name":
      return formatName(row, column.key);
    case "date":
      return formatDate(getValue(row, column.key));
    case "money":
      return formatMoney(getValue(row, column.key), row);
    case "count":
      return formatCount(getValue(row, column.key));
    case "badge":
    case "boolean":
      return String(getValue(row, column.key) ?? "—");
    default:
      return formatText(getValue(row, column.key));
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

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export default function ResourcePage({ resourceKey }: { resourceKey: string }) {
  const resource = getResource(resourceKey);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{
    mode: "create" | "edit";
    row?: Entity;
  } | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<
    Record<string, Array<{ value: string; label: string }>>
  >({});
  const [optionErrors, setOptionErrors] = useState<Record<string, string>>({});

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
    resource?.endpoint ?? "",
    resourceKey,
    { page, limit: PAGE_SIZE, search: debouncedSearch },
  );

  const totalPages = useMemo(() => meta?.totalPages ?? 1, [meta]);

  useEffect(() => {
    if (!dialog || !resource) return;
    let cancelled = false;
    const endpoints = [
      ...new Set(
        resource.fields
          .filter(
            (field) =>
              field.type === "select" &&
              field.optionsEndpoint &&
              (dialog.mode === "create" || !field.createOnly),
          )
          .map((field) => field.optionsEndpoint as string),
      ),
    ];

    setOptions({});
    setOptionErrors({});
    void Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const result = await api.list<Entity>(endpoint, { page: 1, limit: 100 });
          const items = result.data
            .map((item) => {
              const id = String(item._id ?? item.id ?? "");
              const labelField = resource.fields.find(
                (field) => field.optionsEndpoint === endpoint,
              )?.optionLabel;
              const label = labelField ? item[labelField] : undefined;
              return {
                value: id,
                label: String(
                  label ??
                    item.name ??
                    item.number ??
                    item.code ??
                    item.email ??
                    id,
                ),
              };
            })
            .filter((item) => item.value);
          if (!cancelled) {
            setOptions((current) => ({ ...current, [endpoint]: items }));
          }
        } catch (loadError) {
          if (!cancelled) {
            setOptionErrors((current) => ({
              ...current,
              [endpoint]:
                loadError instanceof Error
                  ? loadError.message
                  : "Impossible de charger les options",
            }));
          }
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [dialog, resource]);

  const openCreateDialog = () => {
    setActionError(null);
    setFormError(null);
    setFormValues(
      Object.fromEntries(
        (resource?.fields ?? [])
          .filter((field) => !field.createOnly)
          .map((field) => [field.key, field.type === "boolean" ? false : ""]),
      ),
    );
    setDialog({ mode: "create" });
  };

  const openEditDialog = (row: Entity) => {
    setActionError(null);
    setFormError(null);
    setFormValues(
      Object.fromEntries(
        (resource?.fields ?? [])
          .filter((field) => !field.createOnly)
          .map((field) => {
            const value = getNestedValue(row, field.key);
            return [
              field.key,
              field.type === "boolean"
                ? Boolean(value)
                : value === null || value === undefined
                  ? ""
                  : field.type === "date"
                    ? String(value).slice(0, 10)
                    : String(value),
            ];
          }),
      ),
    );
    setDialog({ mode: "edit", row });
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resource || !dialog) return;
    setSaving(true);
    setFormError(null);

    const payload: Record<string, unknown> = {};
    resource.fields.forEach((field: ResourceField) => {
      if (field.createOnly && dialog.mode === "edit") return;
      const value = formValues[field.key];
      if (value === "" && !field.required) return;
      const converted =
        field.type === "number" && value !== ""
          ? Number(value)
          : field.type === "boolean"
            ? Boolean(value)
            : value;
      setNestedValue(payload, field.key, converted);
    });

    try {
      if (dialog.mode === "create") {
        await api.create(resource.endpoint, payload);
      } else {
        const id = dialog.row?._id ?? dialog.row?.id;
        if (!id) throw new Error("Identifiant manquant pour cette ressource");
        await api.update(`${resource.endpoint}/${id}`, payload);
      }
      setDialog(null);
      refresh();
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "L’enregistrement a échoué",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Entity) => {
    if (!resource) return;
    const id = row._id ?? row.id;
    if (!id) {
      setActionError("Identifiant manquant : suppression impossible.");
      return;
    }
    if (!window.confirm(`Supprimer cet élément de « ${resource.title} » ?`)) {
      return;
    }

    setActionError(null);
    try {
      await api.remove(`${resource.endpoint}/${id}`);
      refresh();
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "La suppression a échoué",
      );
    }
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
        .map((c) => formatCell(row, c).replace(/;/g, ","))
        .join(";"),
    );
    const csv = `\uFEFF${[headers, ...rows].join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resourceKey}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
          </p>
        </div>
        <div className="resource-actions">
          <button
            className="btn-action btn-primary-action"
            onClick={openCreateDialog}
          >
            <i className="pi pi-plus"></i>
            <span>Ajouter</span>
          </button>
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
              data.map((row, index) => (
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
                            : formatCell(row, column)}
                        </span>
                      ) : (
                        formatCell(row, column)
                      )}
                    </td>
                  ))}
                  <td className="actions-cell">
                    <button
                      className="row-action"
                      onClick={() => openEditDialog(row)}
                      aria-label={`Modifier ${resource.singular}`}
                      title="Modifier"
                    >
                      <i className="pi pi-pencil"></i>
                    </button>
                    {row[resource.deleteProtectedKey ?? ""] !== true && (
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
              ))
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
            className="resource-dialog"
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
              <div className="dialog-fields">
                {resource.fields
                  .filter(
                    (field) =>
                      dialog.mode === "create" || !field.createOnly,
                  )
                  .map((field) => {
                    const fieldId = `${resource.key}-${field.key}`;
                    const value = formValues[field.key] ?? "";
                    const fieldOptions = field.options
                      ? field.options.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))
                      : field.optionsEndpoint
                        ? options[field.optionsEndpoint] ?? []
                        : [];

                    return (
                      <label
                        className={`dialog-field ${field.type === "boolean" ? "dialog-checkbox" : ""}`}
                        key={field.key}
                        htmlFor={fieldId}
                      >
                        {field.type === "boolean" ? (
                          <>
                            <input
                              id={fieldId}
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(event) =>
                                setFormValues((current) => ({
                                  ...current,
                                  [field.key]: event.target.checked,
                                }))
                              }
                            />
                            <span>{field.label}</span>
                          </>
                        ) : field.type === "select" ? (
                          <>
                            <span>
                              {field.label}
                              {field.required && <b aria-hidden="true"> *</b>}
                            </span>
                            <select
                              id={fieldId}
                              required={field.required}
                              value={String(value)}
                              onChange={(event) =>
                                setFormValues((current) => ({
                                  ...current,
                                  [field.key]: event.target.value,
                                }))
                              }
                            >
                              <option value="">Sélectionner…</option>
                              {fieldOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {field.optionsEndpoint &&
                              optionErrors[field.optionsEndpoint] && (
                                <small className="field-error">
                                  {optionErrors[field.optionsEndpoint]}
                                </small>
                              )}
                          </>
                        ) : (
                          <>
                            <span>
                              {field.label}
                              {field.required && <b aria-hidden="true"> *</b>}
                            </span>
                            <input
                              id={fieldId}
                              type={field.type}
                              required={field.required}
                              min={field.min}
                              max={field.max}
                              minLength={field.minLength}
                              step={field.step}
                              value={String(value)}
                              onChange={(event) =>
                                setFormValues((current) => ({
                                  ...current,
                                  [field.key]: event.target.value,
                                }))
                              }
                            />
                          </>
                        )}
                      </label>
                    );
                  })}
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
          color: #22c55e;
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
          border-color: #22c55e;
          color: #22c55e;
        }
        .btn-primary-action {
          background: #22c55e;
          border-color: #22c55e;
          color: #fff;
        }
        .btn-primary-action:hover {
          background: #16a34a;
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
          border-color: #22c55e;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
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
          background: rgba(34, 197, 94, 0.12);
          color: #15803d;
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
          border-top-color: #22c55e;
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
          border-color: #22c55e;
          color: #22c55e;
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
          border-color: #16a34a;
          color: #15803d;
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
          color: #15803d;
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
          border-color: #16a34a;
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
          accent-color: #16a34a;
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
