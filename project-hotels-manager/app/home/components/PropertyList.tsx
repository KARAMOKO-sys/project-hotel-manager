"use client";

import { useState } from "react";
import Link from "next/link";
import { useProperties, usePropertyTypeCounts } from "@/hooks/useProperties";
import { coverImage, formatAddress } from "@/lib/format";
import { propertyTypeLabel } from "@/lib/property-types";
import type { Property, PropertyFilter, PropertyType } from "@/types";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

type ActiveTab = "all" | PropertyType;

/** Nombre maximum d'onglets de type affichés (les plus représentés). */
const MAX_TYPE_TABS = 3;

function Stars({ rating = 0 }: { rating?: number }) {
  return (
    <span className="text-warning" aria-label={`${rating} étoiles`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <i
          key={i}
          className={`pi ${i < rating ? "pi-star-fill" : "pi-star"} me-1`}
          style={{ fontSize: "0.8rem" }}
        ></i>
      ))}
    </span>
  );
}

function PropertyCard({
  property,
  index,
}: {
  property: Property;
  index: number;
}) {
  const href = `/property/${property._id}`;

  return (
    <div className="col-lg-4 col-md-6 mb-4">
      <div
        className="card property-card h-100 border-0 shadow-sm rounded-4 overflow-hidden"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        {/* Image */}
        <div className="position-relative overflow-hidden">
          <img
            src={coverImage(property.images)}
            className="card-img-top property-card-img"
            alt={property.name}
            style={{ height: "280px", objectFit: "cover" }}
          />

          {/* Badges */}
          <div className="position-absolute top-0 start-0 w-100 p-3 d-flex justify-content-between">
            <span className="badge bg-success px-3 py-2 rounded-pill fw-semibold shadow-sm">
              <i className="pi pi-folder me-1"></i>
              {propertyTypeLabel(property.type)}
            </span>
            {property.address?.city && (
              <span className="badge bg-white text-success px-3 py-2 rounded-pill fw-semibold shadow-sm">
                <i className="pi pi-map-marker me-1"></i>
                {property.address.city}
              </span>
            )}
          </div>

          {/* Overlay au survol */}
          <div className="property-card-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
            <Link
              href={href}
              className="btn btn-light rounded-pill px-4 py-2 fw-semibold shadow-lg"
            >
              <i className="pi pi-eye me-2"></i>
              Voir les détails
            </Link>
          </div>
        </div>

        {/* Corps */}
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Stars rating={property.star_rating} />
            <small className="text-muted">{property.code}</small>
          </div>

          <Link href={href} className="text-decoration-none">
            <h5 className="card-title text-dark fw-semibold mb-2 property-card-title">
              {property.name}
            </h5>
          </Link>

          <p className="text-muted small mb-3">
            <i className="pi pi-map-marker text-success me-2"></i>
            {formatAddress(property.address) || "Adresse non renseignée"}
          </p>

          <div className="d-flex justify-content-between pt-3 border-top border-success-subtle">
            <div className="text-center">
              <div className="icon-box-small mb-1">
                <i className="pi pi-sign-in text-success"></i>
              </div>
              <small className="text-muted fw-medium">
                {property.check_in_time ?? "—"}
              </small>
            </div>
            <div className="text-center">
              <div className="icon-box-small mb-1">
                <i className="pi pi-sign-out text-success"></i>
              </div>
              <small className="text-muted fw-medium">
                {property.check_out_time ?? "—"}
              </small>
            </div>
            <div className="text-center">
              <div className="icon-box-small mb-1">
                <i className="pi pi-check-circle text-success"></i>
              </div>
              <small className="text-muted fw-medium">
                {property.amenities.length} équipement
                {property.amenities.length > 1 ? "s" : ""}
              </small>
            </div>
          </div>
        </div>

        <div className="card-footer bg-white border-0 p-4 pt-0">
          <Link
            href={href}
            className="btn btn-outline-success w-100 rounded-pill fw-semibold"
          >
            <i className="pi pi-arrow-right me-2"></i>
            Voir la propriété
          </Link>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="col-lg-4 col-md-6 mb-4">
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
        <div className="skeleton skeleton-img"></div>
        <div className="card-body p-4">
          <div className="skeleton skeleton-line w-50 mb-3"></div>
          <div className="skeleton skeleton-line w-75 mb-2"></div>
          <div className="skeleton skeleton-line w-100 mb-4"></div>
          <div className="skeleton skeleton-line w-100"></div>
        </div>
      </div>
    </div>
  );
}

export default function PropertyList({
  initialFilter = {},
  pageSize = 6,
  paginated = false,
}: {
  initialFilter?: PropertyFilter;
  pageSize?: number;
  /** Affiche la pagination (page catalogue) au lieu du lien "voir plus". */
  paginated?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    initialFilter.type ?? "all",
  );
  const [page, setPage] = useState(1);
  const { typeCounts } = usePropertyTypeCounts();

  const typeTabs = typeCounts.slice(0, MAX_TYPE_TABS).map((t) => t.type);
  if (activeTab !== "all" && !typeTabs.includes(activeTab)) {
    typeTabs.push(activeTab);
  }

  const filter: PropertyFilter = {
    ...initialFilter,
    type: activeTab === "all" ? undefined : activeTab,
    page,
    limit: pageSize,
  };

  const filterKey = JSON.stringify(filter);
  const { properties, meta, loading, error } = useProperties(filter);

  const selectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "all", label: "Toutes" },
    ...typeTabs.map((type) => ({ key: type, label: propertyTypeLabel(type) })),
  ];

  return (
    <div className="property-list-section position-relative py-5">
      <div className="shape-blob shape-blob-1"></div>
      <div className="shape-blob shape-blob-2"></div>

      <div className="container position-relative z-2">
        {/* En-tête */}
        <div className="row mb-5">
          <div className="col-lg-6">
            <div className="section-header">
              <span className="badge bg-success-subtle text-success border border-success mb-3 px-4 py-2 rounded-pill fw-semibold">
                <i className="pi pi-building me-2"></i>
                Nos propriétés
              </span>
              <h2 className="display-5 fw-bold mb-3 text-dark">
                Nos <span className="text-success">établissements</span>
              </h2>
              <p className="text-muted fs-5 lh-base">
                Découvrez nos hôtels, résidences et logements disponibles.
                {meta && meta.total > 0 && (
                  <> {meta.total} propriété{meta.total > 1 ? "s" : ""} trouvée{meta.total > 1 ? "s" : ""}.</>
                )}
              </p>
            </div>
          </div>

          {/* Onglets de filtre par type */}
          <div className="col-lg-6">
            <div className="d-flex gap-2 justify-content-lg-end align-items-center flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectTab(tab.key)}
                  className={`btn tab-btn px-4 py-3 rounded-pill fw-semibold ${
                    activeTab === tab.key
                      ? "btn-success text-white shadow-lg"
                      : "btn-outline-success"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="row g-4">
            {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-5">
            <i className="pi pi-exclamation-circle text-danger fs-1 d-block mb-3"></i>
            <p className="text-muted fs-5">{error}</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-5">
            <i className="pi pi-search text-success fs-1 d-block mb-3"></i>
            <p className="text-muted fs-5">
              Aucune propriété ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <div className="row g-4" key={filterKey}>
            {properties.map((property, index) => (
              <PropertyCard key={property._id} property={property} index={index} />
            ))}
          </div>
        )}

        {paginated
          ? meta &&
            meta.totalPages > 1 && (
              <nav className="d-flex justify-content-center align-items-center gap-3 mt-5">
                <button
                  type="button"
                  className="btn btn-outline-success rounded-pill px-4"
                  disabled={!meta.hasPreviousPage || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <i className="pi pi-arrow-left me-2"></i>
                  Précédent
                </button>
                <span className="text-muted">
                  Page {meta.page} / {meta.totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-success rounded-pill px-4"
                  disabled={!meta.hasNextPage || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                  <i className="pi pi-arrow-right ms-2"></i>
                </button>
              </nav>
            )
          : meta?.hasNextPage && (
              <div className="text-center mt-5 pt-4">
                <Link
                  href={
                    activeTab === "all"
                      ? "/properties"
                      : `/properties?type=${activeTab}`
                  }
                  className="btn btn-success px-5 py-3 rounded-pill fw-semibold shadow-lg btn-load-more"
                >
                  Voir toutes les propriétés
                  <i className="pi pi-arrow-right ms-2"></i>
                </Link>
              </div>
            )}
      </div>

      <style jsx global>{`
        :root {
          --primary-color: #22c55e;
          --primary-color-hover: #16a34a;
        }

        .property-list-section {
          background: #ffffff;
          position: relative;
          overflow: hidden;
        }

        .shape-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          z-index: 1;
          opacity: 0.5;
        }
        .shape-blob-1 {
          top: -10%;
          right: -5%;
          width: 400px;
          height: 400px;
          background: rgba(34, 197, 94, 0.1);
        }
        .shape-blob-2 {
          bottom: -10%;
          left: -5%;
          width: 300px;
          height: 300px;
          background: rgba(34, 197, 94, 0.08);
        }

        .section-header {
          position: relative;
          z-index: 2;
        }
        .display-5 {
          font-size: 2.5rem;
          line-height: 1.2;
        }
        @media (min-width: 992px) {
          .display-5 {
            font-size: 3rem;
          }
        }

        /* Carte propriété */
        .property-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          background: white;
          border: 1px solid rgba(34, 197, 94, 0.1);
          animation: fadeInUp 0.5s ease-out forwards;
          opacity: 0;
        }
        .property-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(34, 197, 94, 0.15) !important;
          border-color: rgba(34, 197, 94, 0.3);
        }
        .property-card-img {
          transition: transform 0.4s ease;
        }
        .property-card:hover .property-card-img {
          transform: scale(1.08);
        }
        .property-card-overlay {
          background: rgba(34, 197, 94, 0.85);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .property-card:hover .property-card-overlay {
          opacity: 1;
        }
        .property-card-title {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .icon-box-small {
          width: 35px;
          height: 35px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(34, 197, 94, 0.1);
          border-radius: 50%;
          transition: all 0.3s ease;
        }
        .property-card:hover .icon-box-small {
          background: rgba(34, 197, 94, 0.2);
          transform: scale(1.1);
        }

        /* Onglets */
        .tab-btn {
          transition: all 0.3s ease;
          min-width: 140px;
        }
        .tab-btn:hover {
          transform: translateY(-3px);
        }
        .btn-success {
          background-color: var(--primary-color) !important;
          border: none !important;
        }
        .btn-success:hover {
          background-color: var(--primary-color-hover) !important;
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4) !important;
        }
        .btn-outline-success {
          border: 2px solid var(--primary-color);
          color: var(--primary-color);
          background: transparent;
        }
        .btn-outline-success:hover {
          background-color: var(--primary-color);
          color: white;
          transform: translateY(-3px);
        }

        .badge.bg-success {
          background-color: var(--primary-color) !important;
        }
        .badge.bg-success-subtle {
          background-color: rgba(34, 197, 94, 0.1) !important;
        }
        .badge.bg-white {
          background-color: white;
          color: var(--primary-color);
        }
        .text-success {
          color: var(--primary-color) !important;
        }
        .border-success-subtle {
          border-color: rgba(34, 197, 94, 0.2) !important;
        }

        /* Squelette de chargement */
        .skeleton {
          background: linear-gradient(
            90deg,
            #eef2f0 25%,
            #e2e8e6 50%,
            #eef2f0 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }
        .skeleton-img {
          height: 280px;
          border-radius: 0;
        }
        .skeleton-line {
          height: 14px;
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 991px) {
          .section-header {
            text-align: center;
            margin-bottom: 2rem;
          }
          .d-flex.justify-content-lg-end {
            justify-content: center !important;
          }
          .tab-btn {
            min-width: 120px;
            padding: 0.75rem 1.5rem;
          }
        }
        @media (max-width: 576px) {
          .display-5 {
            font-size: 1.8rem;
          }
          .tab-btn {
            width: 100%;
            margin-bottom: 0.5rem;
          }
          .property-card-img {
            height: 220px !important;
          }
        }
      `}</style>
    </div>
  );
}
