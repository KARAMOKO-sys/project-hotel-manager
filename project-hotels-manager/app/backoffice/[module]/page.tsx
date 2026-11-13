"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/services/api/client";
import { getResource, type BackofficeAction } from "../resources";

type ApiRecord = Record<string, unknown>;

interface ListResult {
  records: ApiRecord[];
  totalPages: number;
  total: number | null;
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseList(payload: unknown): ListResult {
  if (Array.isArray(payload)) {
    return { records: payload.filter(isRecord), totalPages: 1, total: payload.length };
  }
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error("Le backend a renvoyé une liste dans un format inattendu.");
  }
  const meta = isRecord(payload.meta) ? payload.meta : {};
  return {
    records: payload.data.filter(isRecord),
    totalPages:
      typeof meta.totalPages === "number" && meta.totalPages > 0
        ? meta.totalPages
        : 1,
    total: typeof meta.total === "number" ? meta.total : null,
  };
}

function isSensitiveField(key: string) {
  return /password|secret|token|hash|credential|api.?key/i.test(key);
}

function containsSensitiveField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveField);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => isSensitiveField(key) || containsSensitiveField(nested),
  );
}

function sanitizeForDisplay(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeForDisplay);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSensitiveField(key))
      .map(([key, nested]) => [key, sanitizeForDisplay(nested)]),
  );
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(sanitizeForDisplay(value));
}

function getId(record: ApiRecord): string | null {
  const value = record._id ?? record.id;
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

function editableRecord(record: ApiRecord): ApiRecord {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([key, value]) =>
        !isSensitiveField(key) &&
        !containsSensitiveField(value) &&
        !["_id", "id", "__v", "created_at", "updated_at", "deleted_at"].includes(key),
    ),
  );
}

export default function BackofficeModulePage() {
  const params = useParams<{ module: string }>();
  const resource = getResource(params.module);
  const [result, setResult] = useState<ListResult>({
    records: [],
    totalPages: 1,
    total: null,
  });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorText, setEditorText] = useState("{}");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!resource) return;
    setLoading(true);
    setError(null);
    try {
      const listPath =
        search && resource.lookupByIdPrefix
          ? `/${resource.endpoint}/${resource.lookupByIdPrefix}${encodeURIComponent(search)}`
          : `/${resource.listEndpoint ?? resource.endpoint}`;
      const { data } = await apiClient.get<unknown>(listPath, {
        params: { page, limit: 25, ...(search ? { search } : {}) },
      });
      setResult(parseList(data));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger les données de ce module.",
      );
    } finally {
      setLoading(false);
    }
  }, [resource, page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(() => {
    const first = result.records[0];
    if (!first) return [];
    return Object.keys(first)
      .filter(
        (key) =>
          !isSensitiveField(key) &&
          !["__v", "password_changed_at", "last_login_ip"].includes(key),
      )
      .slice(0, 6);
  }, [result.records]);

  if (!resource) {
    return (
      <section className="bo-empty-state">
        <i className="pi pi-exclamation-circle" aria-hidden="true" />
        <h1>Module introuvable</h1>
        <p>Ce module n’est pas défini dans le catalogue du backoffice.</p>
      </section>
    );
  }
  const activeResource = resource;
  const canCreate = !resource.readOnly && resource.createEnabled !== false;
  const canUpdate = !resource.readOnly && resource.updateEnabled !== false;
  const canDelete = !resource.readOnly && resource.deleteEnabled !== false;
  const hasRowActions =
    canUpdate || canDelete || Boolean(resource.actions?.length);

  function openCreate() {
    setEditingId(null);
    setEditorText("{}");
    setEditorError(null);
    setEditorOpen(true);
  }

  function openEdit(record: ApiRecord) {
    const id = getId(record);
    if (!id) {
      setError("Impossible de modifier cet enregistrement : identifiant absent.");
      return;
    }
    setEditingId(id);
    setEditorText(JSON.stringify(editableRecord(record), null, 2));
    setEditorError(null);
    setEditorOpen(true);
  }

  async function saveRecord() {
    let payload: unknown;
    try {
      payload = JSON.parse(editorText);
      if (!isRecord(payload)) {
        throw new Error("Le contenu doit être un objet JSON.");
      }
    } catch (cause) {
      setEditorError(
        cause instanceof Error ? cause.message : "JSON invalide.",
      );
      return;
    }
    setSaving(true);
    setEditorError(null);
    try {
      if (editingId && canUpdate) {
        await apiClient.patch(`/${activeResource.endpoint}/${encodeURIComponent(editingId)}`, payload);
      } else {
        if (editingId) {
          throw new Error("La modification n’est pas disponible pour ce module.");
        }
        await apiClient.post(`/${activeResource.endpoint}`, payload);
      }
      setEditorOpen(false);
      await load();
    } catch (cause) {
      setEditorError(
        cause instanceof Error ? cause.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record: ApiRecord) {
    const id = getId(record);
    if (!id) {
      setError("Impossible de supprimer cet enregistrement : identifiant absent.");
      return;
    }
    if (!window.confirm("Supprimer définitivement cet enregistrement ?")) return;
    try {
      if (!canDelete) {
        throw new Error("La suppression n’est pas disponible pour ce module.");
      }
      await apiClient.delete(`/${activeResource.endpoint}/${encodeURIComponent(id)}`);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Suppression impossible.",
      );
    }
  }

  async function runAction(
    record: ApiRecord,
    action: BackofficeAction,
  ) {
    const id = getId(record);
    if (!id) {
      setError("Impossible d’effectuer cette action : identifiant absent.");
      return;
    }
    if (
      action.confirm &&
      !window.confirm(`Confirmer l’action « ${action.label} » ?`)
    ) {
      return;
    }
    try {
      const actionPath = `/${activeResource.endpoint}/${encodeURIComponent(id)}${
        action.endpoint ? `/${action.endpoint}` : ""
      }`;
      if (action.method === "delete") {
        await apiClient.delete(actionPath);
      } else {
        await apiClient.patch(actionPath, action.body);
      }
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `L’action « ${action.label} » a échoué.`,
      );
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <>
      <div className="bo-page-heading">
        <div>
          <span className="bo-eyebrow">{resource.group.toUpperCase()}</span>
          <h1>{resource.label}</h1>
          <p>
            {result.total === null
              ? "Données synchronisées avec l’API."
              : `${result.total.toLocaleString("fr-FR")} enregistrement${result.total === 1 ? "" : "s"}`}
          </p>
        </div>
        {canCreate && (
          <button
            className="bo-button bo-button-primary"
            onClick={openCreate}
          >
            <i className="pi pi-plus" aria-hidden="true" />
            Ajouter
          </button>
        )}
      </div>
      <section className="bo-panel">
        <form className="bo-toolbar" onSubmit={submitSearch}>
          <label className="bo-search">
            <i className="pi pi-search" aria-hidden="true" />
            <input
              aria-label={`Rechercher dans ${resource.label}`}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={
                resource.lookupByIdPrefix
                  ? "Rechercher par identifiant utilisateur…"
                  : `Rechercher dans ${resource.label.toLowerCase()}…`
              }
              value={searchInput}
            />
          </label>
          <button className="bo-button bo-button-secondary" type="submit">
            Rechercher
          </button>
          <button
            className="bo-icon-button"
            onClick={() => void load()}
            title="Actualiser"
            type="button"
          >
            <i className="pi pi-refresh" aria-hidden="true" />
          </button>
        </form>
        {error && (
          <div className="bo-alert bo-alert-error" role="alert">
            <span>{error}</span>
            <button className="bo-text-button" onClick={() => void load()}>
              Réessayer
            </button>
          </div>
        )}
        {loading ? (
          <div className="bo-table-state">
            <span className="bo-loader" aria-hidden="true" />
            Chargement des données…
          </div>
        ) : result.records.length === 0 ? (
          <div className="bo-empty-state">
            <i className="pi pi-inbox" aria-hidden="true" />
            <h2>Aucun enregistrement</h2>
            <p>
              {search
                ? "Aucun résultat ne correspond à cette recherche."
                : "Ce module ne contient pas encore de données."}
            </p>
          </div>
        ) : (
          <div className="bo-table-wrap">
            <table className="bo-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column.replaceAll("_", " ")}</th>
                  ))}
                  {hasRowActions && <th aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {result.records.map((record, index) => (
                  <tr key={getId(record) ?? index}>
                    {columns.map((column) => (
                      <td key={column} title={displayValue(record[column])}>
                        {displayValue(record[column])}
                      </td>
                    ))}
                    {hasRowActions && (
                      <td className="bo-row-actions">
                        {(canUpdate || canDelete) && (
                          <>
                            {canUpdate && (
                              <button
                                aria-label={`Modifier la ligne ${index + 1}`}
                                className="bo-icon-button"
                                onClick={() => openEdit(record)}
                              >
                                <i className="pi pi-pencil" aria-hidden="true" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                aria-label={`Supprimer la ligne ${index + 1}`}
                                className="bo-icon-button bo-danger-icon"
                                onClick={() => void deleteRecord(record)}
                              >
                                <i className="pi pi-trash" aria-hidden="true" />
                              </button>
                            )}
                          </>
                        )}
                        {resource.actions?.map((action) => (
                          <button
                            aria-label={`${action.label}, ligne ${index + 1}`}
                            className="bo-action-button"
                            key={action.endpoint}
                            onClick={() => void runAction(record, action)}
                            title={action.label}
                          >
                            {action.label}
                          </button>
                        ))}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="bo-pagination">
          <span>
            Page {page} sur {result.totalPages}
          </span>
          <div>
            <button
              className="bo-button bo-button-secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Précédent
            </button>
            <button
              className="bo-button bo-button-secondary"
              disabled={page >= result.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Suivant
            </button>
          </div>
        </footer>
      </section>
      {editorOpen && (
        <div className="bo-modal-backdrop" role="presentation">
          <section
            aria-labelledby="bo-editor-title"
            aria-modal="true"
            className="bo-modal"
            role="dialog"
          >
            <div className="bo-panel-heading">
              <div>
                <h2 id="bo-editor-title">
                  {editingId ? "Modifier l’enregistrement" : "Nouvel enregistrement"}
                </h2>
                <p>Objet JSON conforme au DTO de l’API.</p>
              </div>
              <button
                aria-label="Fermer"
                className="bo-icon-button"
                onClick={() => setEditorOpen(false)}
              >
                <i className="pi pi-times" aria-hidden="true" />
              </button>
            </div>
            <textarea
              className="bo-json-editor"
              onChange={(event) => setEditorText(event.target.value)}
              spellCheck={false}
              value={editorText}
            />
            {editorError && (
              <p className="bo-alert bo-alert-error" role="alert">
                {editorError}
              </p>
            )}
            <div className="bo-modal-actions">
              <button
                className="bo-button bo-button-secondary"
                onClick={() => setEditorOpen(false)}
              >
                Annuler
              </button>
              <button
                className="bo-button bo-button-primary"
                disabled={saving}
                onClick={() => void saveRecord()}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
