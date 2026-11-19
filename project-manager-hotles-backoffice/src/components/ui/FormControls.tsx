// src/components/ui/FormControls.tsx
// Champs de formulaire déclaratifs (ResourceField), éditeur de lignes,
// dialogue d'action et dialogue de résultat. Styles : admin.css (rp-*).

"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { QueryValue } from "@/lib/api";
import {
  buildPayload,
  FieldValueError,
  initialValues,
  loadOptions,
  optionsKey,
  remoteOptionFields,
  type FieldOption,
  type FormValue,
  type FormValues,
  type LineRow,
} from "@/lib/forms";
import type { ResourceField } from "@/lib/resources";

/* ------------------------------------------------------------------ */
/* Options distantes                                                   */
/* ------------------------------------------------------------------ */

export interface OptionsState {
  options: Record<string, FieldOption[]>;
  errors: Record<string, string>;
}

/** Charge les options des champs `select` / `relation` quand `active` est vrai. */
export function useFieldOptions(
  fields: ResourceField[],
  active: boolean,
  scope: Record<string, QueryValue>,
): OptionsState {
  const [state, setState] = useState<OptionsState>({ options: {}, errors: {} });
  const remote = remoteOptionFields(fields);
  const signature = JSON.stringify([remote.map(optionsKey), scope, active]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const targets = remoteOptionFields(fields);
    void Promise.all(
      targets.map(async (field) => {
        const key = optionsKey(field);
        try {
          const items = await loadOptions(
            field.optionsEndpoint as string,
            field.optionLabel,
            field.optionValue,
            scope,
          );
          if (!cancelled) {
            setState((current) => ({
              ...current,
              options: { ...current.options, [key]: items },
            }));
          }
        } catch (error) {
          if (!cancelled) {
            setState((current) => ({
              ...current,
              errors: {
                ...current.errors,
                [key]:
                  error instanceof Error
                    ? error.message
                    : "Impossible de charger les options",
              },
            }));
          }
        }
      }),
    );
    return () => {
      cancelled = true;
    };
    // `signature` résume fields/scope/active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return state;
}

/* ------------------------------------------------------------------ */
/* Champ                                                               */
/* ------------------------------------------------------------------ */

interface FieldControlProps {
  field: ResourceField;
  value: FormValue | undefined;
  onChange: (value: FormValue) => void;
  optionsState: OptionsState;
  idPrefix: string;
  /** Rendu compact (cellule de l'éditeur de lignes) : sans libellé. */
  compact?: boolean;
}

function fieldOptions(field: ResourceField, state: OptionsState): FieldOption[] {
  if (field.options) return field.options;
  if (field.optionsEndpoint) return state.options[optionsKey(field)] ?? [];
  return [];
}

/** Champ mot de passe avec bouton œil pour afficher / masquer la saisie. */
export function PasswordInput({
  id,
  value,
  onChange,
  required,
  minLength,
  placeholder,
  ariaLabel,
  autoComplete = "new-password",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  ariaLabel?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="rp-password">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="rp-password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Masquer la saisie" : "Afficher la saisie"}
        aria-pressed={visible}
        title={visible ? "Masquer" : "Afficher"}
      >
        <i className={`pi ${visible ? "pi-eye-slash" : "pi-eye"}`} aria-hidden="true"></i>
      </button>
    </span>
  );
}

function inputType(field: ResourceField): string {
  switch (field.type) {
    case "datetime":
      return "datetime-local";
    case "list":
      return "text";
    default:
      return field.type;
  }
}

export function FieldControl({
  field,
  value,
  onChange,
  optionsState,
  idPrefix,
  compact = false,
}: FieldControlProps) {
  const id = `${idPrefix}-${field.key}`;
  const stringValue = typeof value === "string" ? value : "";

  if (field.type === "lines") {
    return (
      <div className={`rp-field rp-field-full`}>
        <span className="rp-field-label">
          {field.label}
          {field.required && <b aria-hidden="true"> *</b>}
        </span>
        <LinesEditor
          field={field}
          rows={Array.isArray(value) ? value : []}
          onChange={onChange}
          optionsState={optionsState}
          idPrefix={id}
        />
        {field.help && <small className="rp-field-help">{field.help}</small>}
      </div>
    );
  }

  let control: ReactNode;
  if (field.type === "boolean") {
    control = (
      <input
        id={id}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  } else if (field.type === "select" || field.type === "relation") {
    const options = fieldOptions(field, optionsState);
    const known = options.some((option) => option.value === stringValue);
    control = (
      <select
        id={id}
        required={field.required}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        aria-label={compact ? field.label : undefined}
      >
        <option value="">{compact ? field.label : "Sélectionner…"}</option>
        {!known && stringValue && <option value={stringValue}>{stringValue}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (field.type === "textarea" || field.type === "json") {
    control = (
      <textarea
        id={id}
        required={field.required}
        rows={field.type === "json" ? 5 : 3}
        placeholder={field.placeholder}
        value={stringValue}
        spellCheck={field.type !== "json"}
        className={field.type === "json" ? "rp-mono" : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  } else if (field.type === "password") {
    control = (
      <PasswordInput
        id={id}
        value={stringValue}
        onChange={onChange}
        required={field.required}
        minLength={field.minLength}
        placeholder={compact ? field.label : field.placeholder}
        ariaLabel={compact ? field.label : undefined}
      />
    );
  } else {
    control = (
      <input
        id={id}
        type={inputType(field)}
        required={field.required}
        min={field.min}
        max={field.max}
        minLength={field.minLength}
        step={field.step ?? (field.type === "number" ? "any" : undefined)}
        placeholder={compact ? field.label : field.placeholder}
        aria-label={compact ? field.label : undefined}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (compact) return <>{control}</>;

  const optionError = field.optionsEndpoint
    ? optionsState.errors[optionsKey(field)]
    : undefined;

  if (field.type === "boolean") {
    return (
      <label className="rp-field rp-field-checkbox" htmlFor={id}>
        {control}
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <label
      className={`rp-field ${field.fullWidth || field.type === "json" ? "rp-field-full" : ""}`}
      htmlFor={id}
    >
      <span className="rp-field-label">
        {field.label}
        {field.required && <b aria-hidden="true"> *</b>}
      </span>
      {control}
      {optionError && <small className="rp-field-error">{optionError}</small>}
      {field.help && <small className="rp-field-help">{field.help}</small>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Lignes                                                              */
/* ------------------------------------------------------------------ */

function emptyRow(fields: ResourceField[]): LineRow {
  return Object.fromEntries(fields.map((field) => [field.key, ""]));
}

function LinesEditor({
  field,
  rows,
  onChange,
  optionsState,
  idPrefix,
}: {
  field: ResourceField;
  rows: LineRow[];
  onChange: (rows: LineRow[]) => void;
  optionsState: OptionsState;
  idPrefix: string;
}) {
  const lineFields = field.lineFields ?? [];
  const hasDebitCredit =
    lineFields.some((sub) => sub.key === "debit") &&
    lineFields.some((sub) => sub.key === "credit");
  const sum = (key: string) =>
    rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

  const updateCell = (index: number, key: string, cell: FormValue) => {
    onChange(
      rows.map((row, i) =>
        i === index ? { ...row, [key]: typeof cell === "string" ? cell : String(cell) } : row,
      ),
    );
  };

  return (
    <div className="rp-lines">
      <div className="rp-lines-scroll">
        <table>
          <thead>
            <tr>
              {lineFields.map((sub) => (
                <th key={sub.key}>
                  {sub.label}
                  {sub.required && <b aria-hidden="true"> *</b>}
                </th>
              ))}
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={lineFields.length + 1} className="rp-lines-empty">
                  Aucune ligne.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index}>
                  {lineFields.map((sub) => (
                    <td key={sub.key}>
                      <FieldControl
                        field={{ ...sub, required: false }}
                        value={row[sub.key] ?? ""}
                        onChange={(cell) => updateCell(index, sub.key, cell)}
                        optionsState={optionsState}
                        idPrefix={`${idPrefix}-${index}`}
                        compact
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      type="button"
                      className="rp-icon-btn rp-danger"
                      onClick={() => onChange(rows.filter((_, i) => i !== index))}
                      aria-label={`Supprimer la ligne ${index + 1}`}
                      title="Supprimer la ligne"
                    >
                      <i className="pi pi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {hasDebitCredit && rows.length > 0 && (
            <tfoot>
              <tr>
                {lineFields.map((sub) => (
                  <td key={sub.key}>
                    {sub.key === "debit" || sub.key === "credit"
                      ? sum(sub.key).toLocaleString("fr-FR", { maximumFractionDigits: 2 })
                      : sub === lineFields[0]
                        ? Math.abs(sum("debit") - sum("credit")) < 0.005
                          ? "Équilibrée"
                          : `Écart : ${(sum("debit") - sum("credit")).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`
                        : ""}
                  </td>
                ))}
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <button
        type="button"
        className="rp-link-btn"
        onClick={() => onChange([...rows, emptyRow(lineFields)])}
      >
        <i className="pi pi-plus"></i> Ajouter une ligne
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialogues                                                           */
/* ------------------------------------------------------------------ */

export function Modal({
  title,
  eyebrow,
  onClose,
  busy = false,
  children,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="rp-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={`rp-modal ${wide ? "rp-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="rp-modal-header">
          <div>
            {eyebrow && <p className="rp-eyebrow">{eyebrow}</p>}
            <h3>{title}</h3>
          </div>
          <button
            type="button"
            className="rp-icon-btn"
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer"
          >
            <i className="pi pi-times"></i>
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

/** Dialogue de saisie des paramètres d'une action (motif, date…). */
export function ActionFormDialog({
  title,
  eyebrow,
  message,
  fields,
  scope,
  onCancel,
  onSubmit,
}: {
  title: string;
  eyebrow?: string;
  message?: string;
  fields: ResourceField[];
  scope: Record<string, QueryValue>;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [values, setValues] = useState<FormValues>(() => initialValues(fields));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const optionsState = useFieldOptions(fields, true, scope);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    let payload: Record<string, unknown>;
    try {
      payload = buildPayload(fields, values);
    } catch (conversionError) {
      setError(
        conversionError instanceof FieldValueError
          ? conversionError.message
          : "Saisie invalide",
      );
      return;
    }
    setBusy(true);
    const done = await onSubmit(payload);
    setBusy(false);
    if (!done) setError("L’opération n’a pas abouti (voir la notification).");
  };

  return (
    <Modal title={title} eyebrow={eyebrow} onClose={onCancel} busy={busy}>
      <form onSubmit={handleSubmit}>
        {message && <p className="rp-modal-message">{message}</p>}
        <div className="rp-fields">
          {fields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(value) =>
                setValues((current) => ({ ...current, [field.key]: value }))
              }
              optionsState={optionsState}
              idPrefix="action"
            />
          ))}
        </div>
        {error && (
          <div className="rp-alert" role="alert">
            <i className="pi pi-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        )}
        <div className="rp-modal-actions">
          <button type="button" className="rp-btn" onClick={onCancel} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className="rp-btn rp-btn-primary" disabled={busy}>
            <i className={busy ? "pi pi-spin pi-spinner" : "pi pi-check"}></i>
            {busy ? "Envoi…" : "Valider"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "object") {
    return <pre className="rp-pre">{JSON.stringify(value, null, 2)}</pre>;
  }
  return String(value);
}

/** Affiche la réponse du serveur (secret généré, résultat de test, fiche). */
export function ResultDialog({
  title,
  data,
  onClose,
}: {
  title: string;
  data: unknown;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const record =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  const secret = record && typeof record.secret === "string" ? record.secret : null;

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} wide>
      {secret && (
        <div className="rp-secret">
          <p>
            <i className="pi pi-key"></i> Secret à copier maintenant : il ne sera plus
            affiché.
          </p>
          <div className="rp-secret-row">
            <code>{secret}</code>
            <button type="button" className="rp-btn" onClick={() => void copySecret()}>
              <i className={copied ? "pi pi-check" : "pi pi-copy"}></i>
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
        </div>
      )}
      {record ? (
        <dl className="rp-result">
          {Object.entries(record)
            .filter(([key]) => key !== "secret")
            .map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{renderValue(value)}</dd>
              </div>
            ))}
        </dl>
      ) : (
        <pre className="rp-pre">{JSON.stringify(data, null, 2) ?? "—"}</pre>
      )}
      <div className="rp-modal-actions">
        <button type="button" className="rp-btn rp-btn-primary" onClick={onClose}>
          Fermer
        </button>
      </div>
    </Modal>
  );
}
