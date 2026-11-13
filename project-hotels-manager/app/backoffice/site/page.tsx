"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent } from "react";
import { siteConfigService } from "@/services/api";
import {
  DEFAULT_SITE_CONFIG,
  useSiteConfig,
} from "@/app/shared/contexts/SiteConfigContext";
import type { SiteConfig } from "@/types/site-config";

const SECTION_LABELS: Array<{
  key: keyof SiteConfig["sections"];
  label: string;
}> = [
  { key: "categories", label: "Catégories d’établissements" },
  { key: "about", label: "Présentation" },
  { key: "properties", label: "Établissements à découvrir" },
  { key: "callToAction", label: "Appel à l’action" },
  { key: "team", label: "Équipe" },
  { key: "testimonials", label: "Témoignages" },
];

export default function SiteSettingsPage() {
  const { refresh } = useSiteConfig();
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    siteConfigService
      .getPublic()
      .then((response) => {
        if (!active) return;
        setConfig(response.config);
        setUpdatedAt(response.updated_at);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger les paramètres du site.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateText(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof Pick<
      SiteConfig,
      "brandName" | "tagline" | "primaryColor" | "primaryHoverColor"
    >,
  ) {
    setConfig((current) => ({ ...current, [field]: event.target.value }));
    setMessage(null);
  }

  function updateGroupText(
    group: "hero" | "about" | "callToAction",
    field: string,
    value: string,
  ) {
    setConfig((current) => ({
      ...current,
      [group]: { ...current[group], [field]: value },
    }));
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await siteConfigService.update(config);
      setConfig(response.config);
      setUpdatedAt(response.updated_at);
      setMessage("Les paramètres du site ont été enregistrés.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "L’enregistrement a échoué.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bo-table-state">
        <span className="bo-loader" aria-hidden="true" />
        Chargement des paramètres…
      </div>
    );
  }

  return (
    <>
      <div className="bo-page-heading">
        <div>
          <span className="bo-eyebrow">SITE PUBLIC</span>
          <h1>Personnalisation</h1>
          <p>Modifiez le contenu, les couleurs et les sections du site.</p>
        </div>
        <button
          className="bo-button bo-button-primary"
          disabled={saving}
          onClick={() => void save()}
        >
          <i className="pi pi-check" aria-hidden="true" />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      {error && (
        <p className="bo-alert bo-alert-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="bo-alert bo-alert-success" role="status">
          {message}
        </p>
      )}
      <div className="bo-site-grid">
        <div className="bo-site-forms">
          <section className="bo-panel">
            <div className="bo-panel-heading">
              <div>
                <h2>Identité et thème</h2>
                <p>Nom, signature et couleurs principales.</p>
              </div>
            </div>
            <div className="bo-form-grid">
              <label>
                Nom du site
                <input
                  onChange={(event) => updateText(event, "brandName")}
                  value={config.brandName}
                />
              </label>
              <label>
                Signature
                <input
                  onChange={(event) => updateText(event, "tagline")}
                  value={config.tagline}
                />
              </label>
              <label>
                Couleur principale
                <span className="bo-color-control">
                  <input
                    aria-label="Choisir la couleur principale"
                    onChange={(event) => updateText(event, "primaryColor")}
                    type="color"
                    value={config.primaryColor}
                  />
                  <input
                    aria-label="Code hexadécimal de la couleur principale"
                    onChange={(event) => updateText(event, "primaryColor")}
                    value={config.primaryColor}
                  />
                </span>
              </label>
              <label>
                Couleur au survol
                <span className="bo-color-control">
                  <input
                    aria-label="Choisir la couleur au survol"
                    onChange={(event) => updateText(event, "primaryHoverColor")}
                    type="color"
                    value={config.primaryHoverColor}
                  />
                  <input
                    aria-label="Code hexadécimal de la couleur au survol"
                    onChange={(event) => updateText(event, "primaryHoverColor")}
                    value={config.primaryHoverColor}
                  />
                </span>
              </label>
            </div>
          </section>

          <section className="bo-panel">
            <div className="bo-panel-heading">
              <div>
                <h2>Bannière d’accueil</h2>
                <p>Contenu principal affiché aux visiteurs.</p>
              </div>
            </div>
            <div className="bo-form-grid">
              <label>
                Accroche
                <input
                  onChange={(event) => updateGroupText("hero", "eyebrow", event.target.value)}
                  value={config.hero.eyebrow}
                />
              </label>
              <label>
                Titre
                <input
                  onChange={(event) => updateGroupText("hero", "title", event.target.value)}
                  value={config.hero.title}
                />
              </label>
              <label>
                Texte mis en évidence
                <input
                  onChange={(event) => updateGroupText("hero", "highlight", event.target.value)}
                  value={config.hero.highlight}
                />
              </label>
              <label>
                Libellé du bouton
                <input
                  onChange={(event) => updateGroupText("hero", "ctaLabel", event.target.value)}
                  value={config.hero.ctaLabel}
                />
              </label>
              <label className="bo-form-span">
                Description
                <textarea
                  onChange={(event) => updateGroupText("hero", "description", event.target.value)}
                  rows={3}
                  value={config.hero.description}
                />
              </label>
              <label className="bo-form-span">
                URL de l’image
                <input
                  onChange={(event) => updateGroupText("hero", "imageUrl", event.target.value)}
                  value={config.hero.imageUrl}
                />
              </label>
            </div>
          </section>

          <section className="bo-panel">
            <div className="bo-panel-heading">
              <div>
                <h2>Présentation et contact</h2>
                <p>Contenus des sections de présentation.</p>
              </div>
            </div>
            <div className="bo-form-grid">
              <label>
                Titre de présentation
                <input
                  onChange={(event) => updateGroupText("about", "title", event.target.value)}
                  value={config.about.title}
                />
              </label>
              <label>
                Image de présentation
                <input
                  onChange={(event) => updateGroupText("about", "imageUrl", event.target.value)}
                  value={config.about.imageUrl}
                />
              </label>
              <label className="bo-form-span">
                Description de présentation
                <textarea
                  onChange={(event) => updateGroupText("about", "description", event.target.value)}
                  rows={3}
                  value={config.about.description}
                />
              </label>
              <label>
                Titre de l’appel à l’action
                <input
                  onChange={(event) => updateGroupText("callToAction", "title", event.target.value)}
                  value={config.callToAction.title}
                />
              </label>
              <label>
                Libellé du bouton de contact
                <input
                  onChange={(event) => updateGroupText("callToAction", "buttonLabel", event.target.value)}
                  value={config.callToAction.buttonLabel}
                />
              </label>
              <label className="bo-form-span">
                Description de l’appel à l’action
                <textarea
                  onChange={(event) => updateGroupText("callToAction", "description", event.target.value)}
                  rows={3}
                  value={config.callToAction.description}
                />
              </label>
              <label className="bo-form-span">
                Image de l’appel à l’action
                <input
                  onChange={(event) => updateGroupText("callToAction", "imageUrl", event.target.value)}
                  value={config.callToAction.imageUrl}
                />
              </label>
            </div>
          </section>

          <section className="bo-panel">
            <div className="bo-panel-heading">
              <div>
                <h2>Sections visibles</h2>
                <p>Activez ou masquez les blocs de la page d’accueil.</p>
              </div>
            </div>
            <div className="bo-toggle-list">
              {SECTION_LABELS.map(({ key, label }) => (
                <label className="bo-toggle-row" key={key}>
                  <span>{label}</span>
                  <input
                    checked={config.sections[key]}
                    onChange={(event) => {
                      setConfig((current) => ({
                        ...current,
                        sections: {
                          ...current.sections,
                          [key]: event.target.checked,
                        },
                      }));
                      setMessage(null);
                    }}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>
        <aside className="bo-site-preview">
          <section className="bo-panel bo-preview-card">
            <span className="bo-eyebrow">APERÇU</span>
            <div
              className="bo-preview-hero"
              style={{
                backgroundColor: config.primaryColor,
              }}
            >
              <Image
                alt=""
                fill
                sizes="(max-width: 1100px) 100vw, 35vw"
                src={config.hero.imageUrl}
                unoptimized
              />
              <strong>{config.brandName}</strong>
              <small>{config.tagline}</small>
              <h2>{config.hero.title} {config.hero.highlight}</h2>
              <p>{config.hero.description}</p>
              <span>{config.hero.ctaLabel}</span>
            </div>
            <p className="bo-preview-note">
              Dernière mise à jour :{" "}
              {updatedAt
                ? new Date(updatedAt).toLocaleString("fr-FR")
                : "pas encore publiée"}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
