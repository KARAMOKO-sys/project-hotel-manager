"use client";

import { useState } from "react";
import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

interface Property {
  id: number;
  title: string;
  price: string;
  type: string;
  category: string;
  location: string;
  sqft: string;
  beds: string;
  baths: string;
  image: string;
}

interface PropertyCardProps {
  property: Property;
}

interface PropertiesCollection {
  featured: Property[];
  forSell: Property[];
  forRent: Property[];
}

export default function PropertyList() {
  const [activeTab, setActiveTab] = useState<
    "featured" | "forSell" | "forRent"
  >("featured");

  const properties: PropertiesCollection = {
    featured: [
      {
        id: 1,
        title: "Golden Urban House For Sell",
        price: "$12,345",
        type: "For Sell",
        category: "Appartment",
        location: "123 Street, New York, USA",
        sqft: "1000 Sqft",
        beds: "3 Bed",
        baths: "2 Bath",
        image: "/img/property-1.jpg",
      },
      {
        id: 2,
        title: "Modern Villa With Garden",
        price: "$25,500",
        type: "For Rent",
        category: "Villa",
        location: "456 Avenue, Los Angeles, USA",
        sqft: "2500 Sqft",
        beds: "4 Bed",
        baths: "3 Bath",
        image: "/img/property-2.jpg",
      },
      {
        id: 3,
        title: "Luxury Office Space",
        price: "$18,900",
        type: "For Sell",
        category: "Office",
        location: "789 Boulevard, Chicago, USA",
        sqft: "1500 Sqft",
        beds: "2 Bed",
        baths: "2 Bath",
        image: "/img/property-3.jpg",
      },
      {
        id: 4,
        title: "Commercial Building",
        price: "$45,000",
        type: "For Rent",
        category: "Building",
        location: "321 Road, Houston, USA",
        sqft: "5000 Sqft",
        beds: "6 Bed",
        baths: "4 Bath",
        image: "/img/property-4.jpg",
      },
      {
        id: 5,
        title: "Cozy Family Home",
        price: "$32,750",
        type: "For Sell",
        category: "Home",
        location: "654 Lane, Phoenix, USA",
        sqft: "1800 Sqft",
        beds: "3 Bed",
        baths: "2 Bath",
        image: "/img/property-5.jpg",
      },
      {
        id: 6,
        title: "Retail Shop Space",
        price: "$8,500",
        type: "For Rent",
        category: "Shop",
        location: "987 Street, Philadelphia, USA",
        sqft: "800 Sqft",
        beds: "1 Bed",
        baths: "1 Bath",
        image: "/img/property-6.jpg",
      },
    ],
    forSell: [
      {
        id: 1,
        title: "Golden Urban House For Sell",
        price: "$12,345",
        type: "For Sell",
        category: "Appartment",
        location: "123 Street, New York, USA",
        sqft: "1000 Sqft",
        beds: "3 Bed",
        baths: "2 Bath",
        image: "/img/property-1.jpg",
      },
      {
        id: 3,
        title: "Luxury Office Space",
        price: "$18,900",
        type: "For Sell",
        category: "Office",
        location: "789 Boulevard, Chicago, USA",
        sqft: "1500 Sqft",
        beds: "2 Bed",
        baths: "2 Bath",
        image: "/img/property-3.jpg",
      },
      {
        id: 5,
        title: "Cozy Family Home",
        price: "$32,750",
        type: "For Sell",
        category: "Home",
        location: "654 Lane, Phoenix, USA",
        sqft: "1800 Sqft",
        beds: "3 Bed",
        baths: "2 Bath",
        image: "/img/property-5.jpg",
      },
    ],
    forRent: [
      {
        id: 2,
        title: "Modern Villa With Garden",
        price: "$25,500",
        type: "For Rent",
        category: "Villa",
        location: "456 Avenue, Los Angeles, USA",
        sqft: "2500 Sqft",
        beds: "4 Bed",
        baths: "3 Bath",
        image: "/img/property-2.jpg",
      },
      {
        id: 4,
        title: "Commercial Building",
        price: "$45,000",
        type: "For Rent",
        category: "Building",
        location: "321 Road, Houston, USA",
        sqft: "5000 Sqft",
        beds: "6 Bed",
        baths: "4 Bath",
        image: "/img/property-4.jpg",
      },
      {
        id: 6,
        title: "Retail Shop Space",
        price: "$8,500",
        type: "For Rent",
        category: "Shop",
        location: "987 Street, Philadelphia, USA",
        sqft: "800 Sqft",
        beds: "1 Bed",
        baths: "1 Bath",
        image: "/img/property-6.jpg",
      },
    ],
  };

  const getCurrentProperties = (): Property[] => {
    switch (activeTab) {
      case "featured":
        return properties.featured;
      case "forSell":
        return properties.forSell;
      case "forRent":
        return properties.forRent;
      default:
        return properties.featured;
    }
  };

  const PropertyCard = ({ property }: PropertyCardProps) => (
    <div className="col-lg-4 col-md-6 mb-4">
      <div className="card property-card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
        {/* Image Container */}
        <div className="position-relative overflow-hidden">
          <img
            src={property.image}
            className="card-img-top property-card-img"
            alt={property.title}
            style={{ height: "280px", objectFit: "cover" }}
          />

          {/* Badges */}
          <div className="position-absolute top-0 start-0 w-100 p-3 d-flex justify-content-between">
            <span className="badge bg-success px-3 py-2 rounded-pill fw-semibold shadow-sm">
              <i className="pi pi-tag me-1"></i>
              {property.type}
            </span>
            <span className="badge bg-white text-success px-3 py-2 rounded-pill fw-semibold shadow-sm">
              <i className="pi pi-folder me-1"></i>
              {property.category}
            </span>
          </div>

          {/* Overlay au survol */}
          <div className="property-card-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
            <Link
              href={`/property/${property.id}`}
              className="btn btn-light rounded-pill px-4 py-2 fw-semibold shadow-lg transform-scale"
            >
              <i className="pi pi-eye me-2"></i>
              View Details
            </Link>
          </div>
        </div>

        {/* Card Body */}
        <div className="card-body p-4">
          {/* Price */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-success fw-bold mb-0 fs-4">
              <i className="pi pi-dollar me-1"></i>
              {property.price}
            </h5>
            <span className="badge bg-success-subtle text-success px-3 py-1 rounded-pill">
              <i className="pi pi-star-fill me-1"></i>
              Featured
            </span>
          </div>

          {/* Title */}
          <Link
            href={`/property/${property.id}`}
            className="text-decoration-none"
          >
            <h6 className="card-title text-dark fw-semibold mb-3 property-card-title">
              {property.title}
            </h6>
          </Link>

          {/* Location */}
          <p className="text-muted small mb-3">
            <i className="pi pi-map-marker text-success me-2"></i>
            {property.location}
          </p>

          {/* Features */}
          <div className="d-flex justify-content-between pt-3 border-top border-success-subtle">
            <div className="text-center">
              <div className="icon-box-small mb-1">
                <i className="pi pi-arrows-alt text-success"></i>
              </div>
              <small className="text-muted fw-medium">{property.sqft}</small>
            </div>
            <div className="text-center">
              <div className="icon-box-small mb-1">
                <i className="pi pi-home text-success"></i>
              </div>
              <small className="text-muted fw-medium">{property.beds}</small>
            </div>
            <div className="text-center">
              <div className="icon-box-small mb-1">
                <i className="pi pi-users text-success"></i>
              </div>
              <small className="text-muted fw-medium">{property.baths}</small>
            </div>
          </div>
        </div>

        {/* Card Footer with Action */}
        <div className="card-footer bg-white border-0 p-4 pt-0">
          <Link
            href={`/property/${property.id}`}
            className="btn btn-outline-success w-100 rounded-pill fw-semibold"
          >
            <i className="pi pi-arrow-right me-2"></i>
            View Property
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="property-list-section position-relative py-5">
      {/* Background Decorative Elements */}
      <div className="shape-blob shape-blob-1"></div>
      <div className="shape-blob shape-blob-2"></div>

      <div className="container position-relative z-2">
        {/* Section Header */}
        <div className="row mb-5">
          <div className="col-lg-6">
            <div className="section-header">
              <span className="badge bg-success-subtle text-success border border-success mb-3 px-4 py-2 rounded-pill fw-semibold">
                <i className="pi pi-building me-2"></i>
                Our Properties
              </span>
              <h2 className="display-5 fw-bold mb-3 text-dark">
                Latest Property <span className="text-success">Listing</span>
              </h2>
              <p className="text-muted fs-5 lh-base">
                Découvrez notre sélection de propriétés exclusives. Trouvez la
                maison de vos rêves parmi nos offres variées.
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="col-lg-6">
            <div className="d-flex gap-2 justify-content-lg-end align-items-center flex-wrap">
              <button
                onClick={() => setActiveTab("featured")}
                className={`btn tab-btn px-4 py-3 rounded-pill fw-semibold transition-all ${
                  activeTab === "featured"
                    ? "btn-success text-white shadow-lg"
                    : "btn-outline-success"
                }`}
              >
                <i className="pi pi-star-fill me-2"></i>
                Featured
              </button>
              <button
                onClick={() => setActiveTab("forSell")}
                className={`btn tab-btn px-4 py-3 rounded-pill fw-semibold transition-all ${
                  activeTab === "forSell"
                    ? "btn-success text-white shadow-lg"
                    : "btn-outline-success"
                }`}
              >
                <i className="pi pi-shopping-cart me-2"></i>
                For Sell
              </button>
              <button
                onClick={() => setActiveTab("forRent")}
                className={`btn tab-btn px-4 py-3 rounded-pill fw-semibold transition-all ${
                  activeTab === "forRent"
                    ? "btn-success text-white shadow-lg"
                    : "btn-outline-success"
                }`}
              >
                <i className="pi pi-key me-2"></i>
                For Rent
              </button>
            </div>
          </div>
        </div>

        {/* Property Grid */}
        <div className="row g-4">
          {getCurrentProperties().map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-5 pt-4">
          <button className="btn btn-success px-5 py-3 rounded-pill fw-semibold shadow-lg btn-load-more">
            Browse More Property
            <i className="pi pi-arrow-right ms-2"></i>
          </button>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --primary-color: #22c55e;
          --primary-color-hover: #16a34a;
          --bg-light-green: #e8f5e9;
        }

        .property-list-section {
          background: #ffffff;
          position: relative;
          overflow: hidden;
        }

        /* Background Blobs */
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

        /* Property Card Styles */
        .property-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          background: white;
          border: 1px solid rgba(34, 197, 94, 0.1);
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
          transition: color 0.3s ease;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .property-card:hover .property-card-title {
          color: var(--primary-color);
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

        /* Tab Buttons */
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

        /* Badges */
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

        /* Load More Button */
        .btn-load-more {
          background-color: var(--primary-color);
          border: none;
          transition: all 0.3s ease;
        }

        .btn-load-more:hover {
          background-color: var(--primary-color-hover);
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(34, 197, 94, 0.4);
        }

        /* Text Colors */
        .text-success {
          color: var(--primary-color) !important;
        }

        .border-success-subtle {
          border-color: rgba(34, 197, 94, 0.2) !important;
        }

        /* Animations */
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

        .property-card {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        /* Responsive */
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

          .d-flex {
            flex-direction: column;
          }

          .property-card-img {
            height: 220px !important;
          }
        }
      `}</style>
    </div>
  );
}
