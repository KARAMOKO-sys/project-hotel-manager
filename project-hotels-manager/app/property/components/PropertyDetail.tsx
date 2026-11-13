"use client";

import { useState } from "react";
import Link from "next/link";
import { useProperty } from "@/hooks/useProperties";
import { coverImage, formatAddress, formatPrice } from "@/lib/format";
import { propertyTypeLabel } from "@/lib/property-types";
import type { RoomType } from "@/types";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

function RoomTypeCard({ roomType }: { roomType: RoomType }) {
  const capacity = [
    roomType.capacity_adults && `${roomType.capacity_adults} adulte(s)`,
    roomType.capacity_children && `${roomType.capacity_children} enfant(s)`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="col-md-6">
      <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
        {roomType.images[0] && (
          <img
            src={roomType.images[0]}
            alt={roomType.name}
            className="card-img-top"
            style={{ height: "180px", objectFit: "cover" }}
          />
        )}
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h5 className="fw-semibold mb-0">{roomType.name}</h5>
            <span className="text-success fw-bold text-nowrap ms-2">
              {formatPrice(roomType.base_price)}
              <small className="text-muted fw-normal"> / nuit</small>
            </span>
          </div>
          {roomType.description && (
            <p className="text-muted small mb-3">{roomType.description}</p>
          )}
          <ul className="list-unstyled small text-muted mb-3">
            {capacity && (
              <li>
                <i className="pi pi-users text-success me-2"></i>
                {capacity}
              </li>
            )}
            {roomType.bed_type && (
              <li>
                <i className="pi pi-home text-success me-2"></i>
                Lit {roomType.bed_type}
              </li>
            )}
            {roomType.size_sqm && (
              <li>
                <i className="pi pi-arrows-alt text-success me-2"></i>
                {roomType.size_sqm} m²
              </li>
            )}
          </ul>
          <div className="d-flex flex-wrap gap-1">
            {roomType.amenities.map((amenity) => (
              <span
                key={amenity}
                className="badge bg-success-subtle text-success rounded-pill"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PropertyDetail({ id }: { id: string }) {
  const { property, roomTypes, loading, error } = useProperty(id);
  const [activeImage, setActiveImage] = useState(0);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container py-5 text-center">
        <i className="pi pi-exclamation-circle text-danger fs-1 d-block mb-3"></i>
        <p className="text-muted fs-5 mb-4">
          {error ?? "Propriété introuvable."}
        </p>
        <Link href="/properties" className="btn btn-success rounded-pill px-4">
          <i className="pi pi-arrow-left me-2"></i>
          Retour aux propriétés
        </Link>
      </div>
    );
  }

  const images = property.images.length > 0 ? property.images : [coverImage()];
  const lowestPrice = roomTypes.reduce<RoomType["base_price"] | null>(
    (min, rt) => (!min || rt.base_price.amount < min.amount ? rt.base_price : min),
    null,
  );

  return (
    <div className="container py-5">
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/" className="text-success">Accueil</Link>
          </li>
          <li className="breadcrumb-item">
            <Link href="/properties" className="text-success">Propriétés</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {property.name}
          </li>
        </ol>
      </nav>

      <div className="row g-5">
        <div className="col-lg-7">
          <img
            src={images[activeImage] ?? images[0]}
            alt={property.name}
            className="img-fluid rounded-4 shadow-sm w-100"
            style={{ height: "440px", objectFit: "cover" }}
          />
          {images.length > 1 && (
            <div className="d-flex gap-2 mt-3 flex-wrap">
              {images.map((image, index) => (
                <button
                  key={image + index}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`p-0 border rounded-3 overflow-hidden ${
                    index === activeImage ? "border-success border-2" : ""
                  }`}
                >
                  <img
                    src={image}
                    alt={`${property.name} ${index + 1}`}
                    style={{ width: "80px", height: "60px", objectFit: "cover" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-lg-5">
          <div className="d-flex gap-2 mb-3 flex-wrap">
            <Link
              href={`/properties?type=${property.type}`}
              className="badge bg-success px-3 py-2 rounded-pill text-decoration-none"
            >
              <i className="pi pi-folder me-1"></i>
              {propertyTypeLabel(property.type)}
            </Link>
            {property.star_rating && (
              <span className="badge bg-warning-subtle text-warning-emphasis px-3 py-2 rounded-pill">
                {property.star_rating} <i className="pi pi-star-fill ms-1"></i>
              </span>
            )}
          </div>

          <h1 className="display-6 fw-bold mb-3">{property.name}</h1>
          <p className="text-muted mb-3">
            <i className="pi pi-map-marker text-success me-2"></i>
            {formatAddress(property.address, true) || "Adresse non renseignée"}
          </p>
          {lowestPrice && (
            <h2 className="text-success fw-bold mb-3 fs-3">
              À partir de {formatPrice(lowestPrice)}
              <small className="text-muted fw-normal fs-6"> / nuit</small>
            </h2>
          )}
          {property.description && (
            <p className="text-muted mb-4">{property.description}</p>
          )}

          <div className="d-flex justify-content-around border rounded-4 p-3 mb-4">
            <div className="text-center">
              <i className="pi pi-sign-in text-success fs-4 d-block mb-1"></i>
              <small className="text-muted">
                Arrivée {property.check_in_time ?? "—"}
              </small>
            </div>
            <div className="text-center">
              <i className="pi pi-sign-out text-success fs-4 d-block mb-1"></i>
              <small className="text-muted">
                Départ {property.check_out_time ?? "—"}
              </small>
            </div>
          </div>

          {property.amenities.length > 0 && (
            <div className="mb-4">
              <h6 className="fw-semibold mb-2">Équipements</h6>
              <div className="d-flex flex-wrap gap-2">
                {property.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="badge bg-success-subtle text-success px-3 py-2 rounded-pill"
                  >
                    <i className="pi pi-check me-1"></i>
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(property.contact?.phone || property.contact?.email) && (
            <ul className="list-unstyled text-muted mb-4">
              {property.contact.phone && (
                <li className="mb-1">
                  <i className="pi pi-phone text-success me-2"></i>
                  <a href={`tel:${property.contact.phone}`} className="text-reset">
                    {property.contact.phone}
                  </a>
                </li>
              )}
              {property.contact.email && (
                <li>
                  <i className="pi pi-envelope text-success me-2"></i>
                  <a href={`mailto:${property.contact.email}`} className="text-reset">
                    {property.contact.email}
                  </a>
                </li>
              )}
            </ul>
          )}

          <Link
            href="/contact"
            className="btn btn-success w-100 rounded-pill py-3 fw-semibold mb-2"
          >
            <i className="pi pi-envelope me-2"></i>
            Nous contacter
          </Link>
          <Link
            href="/properties"
            className="btn btn-outline-success w-100 rounded-pill py-3 fw-semibold"
          >
            <i className="pi pi-arrow-left me-2"></i>
            Retour aux propriétés
          </Link>
        </div>
      </div>

      {/* Types de chambres */}
      <section className="mt-5 pt-4">
        <h2 className="fw-bold mb-4">
          Chambres <span className="text-success">disponibles</span>
        </h2>
        {roomTypes.length === 0 ? (
          <p className="text-muted">
            Aucun type de chambre n&apos;est encore renseigné pour cette propriété.
          </p>
        ) : (
          <div className="row g-4">
            {roomTypes.map((roomType) => (
              <RoomTypeCard key={roomType._id} roomType={roomType} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
