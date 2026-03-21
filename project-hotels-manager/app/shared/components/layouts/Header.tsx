"use client";

import { useState, useEffect } from "react";
import { Button } from "primereact/button";
import { Carousel } from "primereact/carousel";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "bootstrap/dist/css/bootstrap.min.css";

interface CarouselImage {
  id: number;
  src: string;
  alt: string;
}

export default function Header() {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const images: CarouselImage[] = [
    { id: 1, src: "/img/carousel-1.jpg", alt: "Property 1" },
    { id: 2, src: "/img/carousel-2.jpg", alt: "Property 2" },
  ];

  const carouselItemTemplate = (item: CarouselImage) => {
    return (
      <div className="position-relative" style={{ height: "550px" }}>
        <img
          className="img-fluid w-100 h-100"
          src={item.src}
          alt={item.alt}
          style={{ objectFit: "cover" }}
        />
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%)",
          }}
        ></div>
      </div>
    );
  };

  return (
    <div className="header-section">
      <div className="container">
        <div className="row align-items-center">
          {/* Texte à gauche */}
          <div className="col-lg-6">
            <div
              className={`header-content ${isVisible ? "fade-in-left" : ""}`}
            >
              <div className="mb-4">
                <span className="welcome-badge">
                  <i className="pi pi-home me-2"></i>
                  Welcome to Makaan
                </span>
              </div>
              <h1 className="display-5 mb-4">
                Find A <span className="text-gradient">Perfect Home</span> To
                Live With Your Family
              </h1>
              <p className="mb-4 pb-2 text-muted fs-5">
                Vero elitr justo clita lorem. Ipsum dolor at sed stet sit diam
                no. Kasd rebum ipsum et diam justo clita et kasd rebum sea
                elitr.
              </p>
              <div className="d-flex flex-wrap gap-3 mb-5">
                <Button
                  label="Get Started"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  className="btn-get-started"
                />
                <Button
                  label="Learn More"
                  icon="pi pi-play"
                  className="btn-learn-more"
                />
              </div>

              {/* Statistiques */}
              <div className="row g-4">
                <div className="col-4">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <i className="pi pi-building fs-3 text-success"></i>
                    </div>
                    <h3 className="mb-0 text-success fw-bold">500+</h3>
                    <p className="text-muted small mb-0">Properties Sold</p>
                  </div>
                </div>
                <div className="col-4">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <i className="pi pi-users fs-3 text-success"></i>
                    </div>
                    <h3 className="mb-0 text-success fw-bold">200+</h3>
                    <p className="text-muted small mb-0">Happy Clients</p>
                  </div>
                </div>
                <div className="col-4">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <i className="pi pi-star fs-3 text-success"></i>
                    </div>
                    <h3 className="mb-0 text-success fw-bold">50+</h3>
                    <p className="text-muted small mb-0">Expert Agents</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Image/Carrousel à droite */}
          <div className="col-lg-6">
            <div
              className={`carousel-wrapper ${isVisible ? "fade-in-right" : ""}`}
            >
              <Carousel
                value={images}
                itemTemplate={carouselItemTemplate}
                numVisible={1}
                numScroll={1}
                circular
                autoplayInterval={3000}
                showIndicators
                showNavigators
                className="header-carousel"
              />
              {/* Indicateurs de confiance */}
              <div className="trust-badges">
                <div className="trust-badge">
                  <i className="pi pi-shield text-success"></i>
                  <span>Trusted Since 2010</span>
                </div>
                <div className="trust-badge">
                  <i className="pi pi-certificate text-success"></i>
                  <span>Licensed Agency</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --success-color: #22c55e;
          --success-dark: #16a34a;
          --success-light: #86efac;
        }

        /* Section principale */
        .header-section {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          padding: 100px 0;
          position: relative;
          overflow: hidden;
        }

        /* Décoration de fond */
        .header-section::before {
          content: "";
          position: absolute;
          top: -30%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.08) 0%,
            rgba(34, 197, 94, 0) 70%
          );
          border-radius: 50%;
          z-index: 0;
        }

        .header-section::after {
          content: "";
          position: absolute;
          bottom: -20%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.05) 0%,
            rgba(34, 197, 94, 0) 70%
          );
          border-radius: 50%;
          z-index: 0;
        }

        /* Contenu */
        .header-content {
          position: relative;
          z-index: 1;
        }

        /* Badge de bienvenue */
        .welcome-badge {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(
            135deg,
            rgba(34, 197, 94, 0.1) 0%,
            rgba(34, 197, 94, 0.05) 100%
          );
          padding: 0.6rem 1.2rem;
          border-radius: 50px;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--success-color);
          border: 1px solid rgba(34, 197, 94, 0.2);
          backdrop-filter: blur(5px);
        }

        /* Titre avec dégradé */
        .display-5 {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1.2;
          color: #1f2937;
        }

        .text-gradient {
          background: linear-gradient(
            135deg,
            var(--success-color) 0%,
            var(--success-dark) 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          position: relative;
          display: inline-block;
        }

        /* Boutons */
        .btn-get-started {
          background: linear-gradient(
            135deg,
            var(--success-color) 0%,
            var(--success-dark) 100%
          );
          border: none;
          border-radius: 50px;
          padding: 0.8rem 2rem;
          font-weight: 600;
          transition: all 0.3s ease;
          color: white;
        }

        .btn-get-started:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
        }

        .btn-learn-more {
          background: transparent;
          border: 2px solid var(--success-color);
          border-radius: 50px;
          padding: 0.8rem 2rem;
          font-weight: 600;
          color: var(--success-color);
          transition: all 0.3s ease;
        }

        .btn-learn-more:hover {
          background: rgba(34, 197, 94, 0.1);
          transform: translateY(-3px);
          border-color: var(--success-dark);
          color: var(--success-dark);
        }

        /* Cartes statistiques */
        .stat-card {
          text-align: left;
          padding: 1rem;
          background: white;
          border-radius: 16px;
          transition: all 0.3s ease;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.2);
        }

        .stat-icon {
          margin-bottom: 0.8rem;
        }

        .stat-card h3 {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 0.25rem;
        }

        /* Carrousel */
        .carousel-wrapper {
          position: relative;
          z-index: 1;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }

        .carousel-wrapper:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 60px rgba(34, 197, 94, 0.2);
        }

        .header-carousel .p-carousel .p-carousel-content {
          border-radius: 24px;
          overflow: hidden;
        }

        /* Indicateurs du carrousel */
        .header-carousel .p-carousel .p-carousel-indicators {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          z-index: 10;
        }

        .header-carousel
          .p-carousel
          .p-carousel-indicators
          .p-carousel-indicator
          button {
          background-color: rgba(255, 255, 255, 0.6);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin: 0 6px;
          transition: all 0.3s ease;
        }

        .header-carousel
          .p-carousel
          .p-carousel-indicators
          .p-highlight
          button {
          background-color: var(--success-color);
          transform: scale(1.3);
          width: 12px;
          height: 12px;
        }

        /* Navigation du carrousel */
        .header-carousel .p-carousel .p-carousel-prev,
        .header-carousel .p-carousel .p-carousel-next {
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border-radius: 50%;
          width: 45px;
          height: 45px;
          transition: all 0.3s ease;
          margin: 0 10px;
          backdrop-filter: blur(5px);
        }

        .header-carousel .p-carousel .p-carousel-prev:hover,
        .header-carousel .p-carousel .p-carousel-next:hover {
          background: var(--success-color);
          color: white;
          transform: scale(1.1);
        }

        /* Badges de confiance */
        .trust-badges {
          position: absolute;
          bottom: 20px;
          right: 20px;
          display: flex;
          gap: 10px;
          z-index: 20;
        }

        .trust-badge {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(5px);
          padding: 0.4rem 0.8rem;
          border-radius: 50px;
          font-size: 0.7rem;
          font-weight: 500;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .trust-badge i {
          font-size: 0.8rem;
        }

        /* Animations */
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .fade-in-left {
          animation: fadeInLeft 0.8s ease forwards;
        }

        .fade-in-right {
          animation: fadeInRight 0.8s ease forwards;
        }

        /* Responsive */
        @media (min-width: 768px) {
          .display-5 {
            font-size: 3.2rem;
          }
          .stat-card h3 {
            font-size: 2rem;
          }
        }

        @media (min-width: 992px) {
          .display-5 {
            font-size: 3.8rem;
          }
        }

        @media (max-width: 768px) {
          .header-section {
            padding: 60px 0;
            text-align: center;
          }

          .display-5 {
            font-size: 2.2rem;
          }

          .welcome-badge {
            justify-content: center;
          }

          .stat-card {
            text-align: center;
          }

          .trust-badges {
            position: relative;
            justify-content: center;
            margin-top: 1rem;
            bottom: auto;
            right: auto;
          }

          .carousel-wrapper {
            margin-top: 2rem;
          }

          .btn-get-started,
          .btn-learn-more {
            width: 100%;
          }
        }

        @media (max-width: 576px) {
          .display-5 {
            font-size: 1.8rem;
          }

          .stat-card h3 {
            font-size: 1.4rem;
          }

          .stat-card p {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
}
