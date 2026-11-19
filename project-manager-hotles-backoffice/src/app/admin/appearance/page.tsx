// src/app/admin/appearance/page.tsx
// Apparence du back-office : couleurs, nom, logo et paramètres d'affichage.
// Les modifications s'appliquent en aperçu immédiat ; « Enregistrer » les
// rend permanentes pour tous les utilisateurs (super-admin / propriétaire).

"use client";

import { useEffect, useRef, useState } from "react";
import { errorMessage, useFeedback } from "@/components/ui/Feedback";
import { useTheme, type BackofficeTheme } from "@/lib/theme";

type ColorKey = {
  [K in keyof BackofficeTheme]: BackofficeTheme[K] extends string ? K : never;
}[keyof BackofficeTheme];

const COLOR_GROUPS: Array<{
  title: string;
  fields: Array<{ key: ColorKey; label: string }>;
}> = [
  {
    title: "Couleurs principales",
    fields: [
      { key: "primaryColor", label: "Couleur principale" },
      { key: "primaryHoverColor", label: "Couleur au survol" },
      { key: "textColor", label: "Texte" },
    ],
  },
  {
    title: "Fonds",
    fields: [
      { key: "pageBackground", label: "Fond des pages" },
      { key: "surfaceColor", label: "Cartes et tableaux" },
      { key: "headerBackground", label: "En-tête" },
    ],
  },
  {
    title: "Barre latérale",
    fields: [
      { key: "sidebarBackground", label: "Fond" },
      { key: "sidebarTextColor", label: "Texte" },
    ],
  },
  {
    title: "Page de connexion",
    fields: [
      { key: "loginGradientStart", label: "Dégradé : début" },
      { key: "loginGradientEnd", label: "Dégradé : fin" },
    ],
  },
];

const PRESETS: Array<{ name: string; values: Partial<BackofficeTheme> }> = [
  { name: "Vert (défaut)", values: { primaryColor: "#22c55e", primaryHoverColor: "#16a34a", loginGradientStart: "#0f5132", loginGradientEnd: "#22a05b" } },
  { name: "Bleu lagune", values: { primaryColor: "#0ea5e9", primaryHoverColor: "#0369a1", loginGradientStart: "#0c4a6e", loginGradientEnd: "#0284c7" } },
  { name: "Orange terre", values: { primaryColor: "#f97316", primaryHoverColor: "#c2410c", loginGradientStart: "#7c2d12", loginGradientEnd: "#ea580c" } },
  { name: "Bordeaux", values: { primaryColor: "#be123c", primaryHoverColor: "#9f1239", loginGradientStart: "#4c0519", loginGradientEnd: "#be123c" } },
  { name: "Violet", values: { primaryColor: "#7c3aed", primaryHoverColor: "#5b21b6", loginGradientStart: "#2e1065", loginGradientEnd: "#7c3aed" } },
  { name: "Ardoise", values: { primaryColor: "#334155", primaryHoverColor: "#1e293b", loginGradientStart: "#0f172a", loginGradientEnd: "#475569" } },
];

const HEX = /^#[\da-f]{6}$/i;

export default function AppearancePage() {
  const { theme, preview, save, reset, revert } = useTheme();
  const { notify, confirm } = useFeedback();
  // null : pas de modification en cours, on affiche le thème enregistré.
  const [edited, setDraft] = useState<BackofficeTheme | null>(null);
  const draft = edited ?? theme;
  const [saving, setSaving] = useState(false);

  // Annule l'aperçu non enregistré en quittant la page.
  const revertRef = useRef(revert);
  useEffect(() => {
    revertRef.current = revert;
  }, [revert]);
  useEffect(() => () => revertRef.current(), []);

  const update = (patch: Partial<BackofficeTheme>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    const colorsValid = COLOR_GROUPS.every((group) =>
      group.fields.every((field) => HEX.test(next[field.key])),
    );
    if (colorsValid) preview(next);
  };

  const invalid = COLOR_GROUPS.flatMap((group) => group.fields).filter(
    (field) => !HEX.test(draft[field.key]),
  );

  const handleSave = async () => {
    if (invalid.length) {
      notify("error", "Couleur invalide", `Format attendu : #RRGGBB (${invalid.map((f) => f.label).join(", ")}).`);
      return;
    }
    setSaving(true);
    try {
      await save(draft);
      setDraft(null);
      notify("success", "Apparence enregistrée", "Elle s’applique à tous les utilisateurs.");
    } catch (error) {
      notify("error", "Enregistrement impossible", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirm(
      "Toutes les couleurs et tous les paramètres reviendront aux valeurs d’origine.",
      "Rétablir l’apparence par défaut ?",
    );
    if (!ok) return;
    setSaving(true);
    try {
      await reset();
      setDraft(null);
      notify("success", "Apparence par défaut rétablie");
    } catch (error) {
      notify("error", "Réinitialisation impossible", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <div>
          <h2>
            <i className="pi pi-palette"></i>Apparence
          </h2>
          <p>Couleurs, identité et affichage du back-office. L’aperçu est immédiat ; enregistrez pour l’appliquer à tous.</p>
        </div>
        <div className="erp-toolbar">
          <button type="button" className="rp-btn" onClick={() => void handleReset()} disabled={saving}>
            <i className="pi pi-replay"></i> Par défaut
          </button>
          <button
            type="button"
            className="rp-btn"
            onClick={() => {
              revert();
              setDraft(null);
            }}
            disabled={saving}
          >
            <i className="pi pi-undo"></i> Annuler
          </button>
          <button type="button" className="rp-btn rp-btn-primary" onClick={() => void handleSave()} disabled={saving}>
            <i className={`pi ${saving ? "pi-spin pi-spinner" : "pi-check"}`}></i> Enregistrer
          </button>
        </div>
      </div>

      <div className="ap-grid">
        <div className="ap-col">
          <section className="ap-card">
            <h3>Thèmes prédéfinis</h3>
            <div className="ap-presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className="ap-preset"
                  onClick={() => update(preset.values)}
                >
                  <span
                    className="ap-preset-swatch"
                    style={{
                      background: `linear-gradient(135deg, ${preset.values.primaryColor} 50%, ${preset.values.loginGradientStart} 50%)`,
                    }}
                  />
                  {preset.name}
                </button>
              ))}
            </div>
          </section>

          {COLOR_GROUPS.map((group) => (
            <section className="ap-card" key={group.title}>
              <h3>{group.title}</h3>
              <div className="ap-fields">
                {group.fields.map((field) => {
                  const value = draft[field.key];
                  const valid = HEX.test(value);
                  return (
                    <label className="ap-color" key={field.key}>
                      <span>{field.label}</span>
                      <span className={`ap-color-input ${valid ? "" : "invalid"}`}>
                        <input
                          type="color"
                          value={valid ? value : "#000000"}
                          onChange={(event) => update({ [field.key]: event.target.value })}
                          aria-label={`${field.label} (sélecteur)`}
                        />
                        <input
                          type="text"
                          value={value}
                          maxLength={7}
                          spellCheck={false}
                          onChange={(event) => update({ [field.key]: event.target.value.trim() })}
                          aria-label={`${field.label} (code hexadécimal)`}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="ap-col">
          <section className="ap-card">
            <h3>Identité</h3>
            <div className="ap-fields ap-fields-single">
              <label className="ap-text">
                <span>Nom de l’application</span>
                <input
                  type="text"
                  value={draft.appName}
                  maxLength={60}
                  onChange={(event) => update({ appName: event.target.value })}
                />
              </label>
              <label className="ap-text">
                <span>Sous-titre</span>
                <input
                  type="text"
                  value={draft.appSubtitle}
                  maxLength={60}
                  onChange={(event) => update({ appSubtitle: event.target.value })}
                />
              </label>
              <label className="ap-text">
                <span>Logo (URL HTTPS ou chemin /img/…)</span>
                <input
                  type="text"
                  value={draft.logoUrl}
                  placeholder="Laisser vide pour l’icône par défaut"
                  onChange={(event) => update({ logoUrl: event.target.value.trim() })}
                />
              </label>
            </div>
          </section>

          <section className="ap-card">
            <h3>Affichage</h3>
            <div className="ap-fields ap-fields-single">
              <label className="ap-range">
                <span>
                  Arrondi des cartes et boutons <b>{draft.borderRadius} px</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={draft.borderRadius}
                  onChange={(event) => update({ borderRadius: Number(event.target.value) })}
                />
              </label>
              <label className="ap-range">
                <span>
                  Taille du texte <b>{draft.fontScale} %</b>
                </span>
                <input
                  type="range"
                  min={85}
                  max={120}
                  step={5}
                  value={draft.fontScale}
                  onChange={(event) => update({ fontScale: Number(event.target.value) })}
                />
              </label>
              <label className="ap-check">
                <input
                  type="checkbox"
                  checked={draft.sidebarCollapsedByDefault}
                  onChange={(event) => update({ sidebarCollapsedByDefault: event.target.checked })}
                />
                <span>Barre latérale repliée à l’ouverture</span>
              </label>
            </div>
          </section>

          <section className="ap-card">
            <h3>Aperçu</h3>
            <div className="ap-preview" style={{ background: draft.pageBackground, color: draft.textColor }}>
              <div className="ap-preview-side" style={{ background: draft.sidebarBackground, color: draft.sidebarTextColor }}>
                <strong style={{ color: draft.primaryColor }}>{draft.appName || "—"}</strong>
                <span className="ap-preview-active" style={{ background: draft.primaryColor }}>Tableau de bord</span>
                <span>Réservations</span>
                <span>Comptabilité</span>
              </div>
              <div className="ap-preview-main">
                <div className="ap-preview-head" style={{ background: draft.headerBackground }} />
                <div className="ap-preview-card" style={{ background: draft.surfaceColor, borderRadius: draft.borderRadius }}>
                  <span>Taux d’occupation</span>
                  <strong>78 %</strong>
                  <button type="button" style={{ background: draft.primaryColor, borderRadius: draft.borderRadius / 2 }}>
                    Action
                  </button>
                </div>
              </div>
            </div>
            <div
              className="ap-preview-login"
              style={{ background: `linear-gradient(135deg, ${draft.loginGradientStart}, ${draft.loginGradientEnd})` }}
            >
              Page de connexion
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        .ap-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
          gap: 1.25rem;
          align-items: start;
        }
        .ap-col {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 1.25rem;
        }
        .ap-card {
          padding: 1.25rem;
          border: 1px solid var(--oskar-gray-200);
          border-radius: var(--radius-lg);
          background: var(--ps-surface);
        }
        .ap-card h3 {
          margin: 0 0 1rem;
          color: var(--ps-text);
          font-size: 0.95rem;
          font-weight: 700;
        }
        .ap-presets {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.6rem;
        }
        .ap-preset {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.55rem 0.7rem;
          border: 1px solid var(--oskar-gray-200);
          border-radius: var(--radius-md);
          background: var(--ps-surface);
          color: var(--ps-text);
          font-size: 0.82rem;
          text-align: left;
        }
        .ap-preset:hover {
          border-color: var(--ps-primary);
        }
        .ap-preset-swatch {
          width: 22px;
          height: 22px;
          flex: none;
          border-radius: 50%;
        }
        .ap-fields {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 0.9rem;
        }
        .ap-fields-single {
          grid-template-columns: 1fr;
        }
        .ap-color,
        .ap-text,
        .ap-range {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin: 0;
          color: var(--oskar-gray-700);
          font-size: 0.82rem;
          font-weight: 600;
        }
        .ap-range b {
          color: var(--ps-primary-dark);
        }
        .ap-color-input {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0.5rem 0.3rem 0.3rem;
          border: 1px solid var(--oskar-gray-200);
          border-radius: var(--radius-md);
        }
        .ap-color-input.invalid {
          border-color: #ef4444;
        }
        .ap-color-input input[type="color"] {
          width: 36px;
          height: 32px;
          flex: none;
          padding: 0;
          border: 0;
          border-radius: 6px;
          background: none;
          cursor: pointer;
        }
        .ap-color-input input[type="text"] {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          font-family: ui-monospace, monospace;
          font-size: 0.85rem;
          text-transform: uppercase;
        }
        .ap-text input {
          padding: 0.6rem 0.75rem;
          border: 1px solid var(--oskar-gray-200);
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          font-weight: 400;
        }
        .ap-text input:focus {
          border-color: var(--ps-primary);
          outline: 0;
          box-shadow: 0 0 0 3px rgba(var(--ps-primary-rgb), 0.12);
        }
        .ap-range input {
          accent-color: var(--ps-primary);
        }
        .ap-check {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin: 0;
          font-size: 0.85rem;
        }
        .ap-check input {
          width: 18px;
          height: 18px;
          accent-color: var(--ps-primary);
        }
        .ap-preview {
          display: flex;
          height: 190px;
          overflow: hidden;
          border: 1px solid var(--oskar-gray-200);
          border-radius: 12px;
          font-size: 0.75rem;
        }
        .ap-preview-side {
          display: flex;
          width: 38%;
          flex-direction: column;
          gap: 0.4rem;
          padding: 0.75rem;
          border-right: 1px solid rgba(0, 0, 0, 0.06);
        }
        .ap-preview-side strong {
          margin-bottom: 0.3rem;
          font-size: 0.85rem;
        }
        .ap-preview-active {
          padding: 0.3rem 0.5rem;
          border-radius: 6px;
          color: #fff;
        }
        .ap-preview-main {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0 0.75rem 0.75rem;
        }
        .ap-preview-head {
          height: 28px;
          margin: 0 -0.75rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        .ap-preview-card {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .ap-preview-card strong {
          font-size: 1.2rem;
        }
        .ap-preview-card button {
          align-self: flex-start;
          margin-top: 0.3rem;
          padding: 0.25rem 0.7rem;
          border: 0;
          color: #fff;
          font-size: 0.72rem;
        }
        .ap-preview-login {
          display: grid;
          height: 56px;
          margin-top: 0.75rem;
          place-items: center;
          border-radius: 12px;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 600;
        }
        @media (max-width: 992px) {
          .ap-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
