"use client";

import { useEffect, useRef } from "react";
import { Button } from "primereact/button";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

interface Feature {
  id: number;
  text: string;
  icon: string;
}

export default function AboutHome() {
  const aboutRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fonction utilitaire pour définir les refs
  const setRef = (index: number) => (el: HTMLDivElement | null) => {
    aboutRefs.current[index] = el;
  };

  useEffect(() => {
    // Observer pour les animations au scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fadeIn");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    aboutRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const features: Feature[] = [
    {
      id: 1,
      text: "Tempor erat elitr rebum at clita",
      icon: "pi pi-check-circle",
    },
    {
      id: 2,
      text: "Aliqu diam amet diam et eos",
      icon: "pi pi-check-circle",
    },
    {
      id: 3,
      text: "Clita duo justo magna dolore erat amet",
      icon: "pi pi-check-circle",
    },
  ];

  return (
    <div className="container-xxl py-5">
      <div className="container">
        <div className="row g-5 align-items-center">
          {/* Image à gauche */}
          <div
            className="col-lg-6 wow fadeIn"
            data-wow-delay="0.1s"
            ref={setRef(0)}
          >
            <div className="about-img position-relative overflow-hidden p-5 pe-0">
              <img
                className="img-fluid w-100 rounded-4"
                src="/img/about.jpg"
                alt="About Us"
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>

          {/* Texte à droite */}
          <div
            className="col-lg-6 wow fadeIn"
            data-wow-delay="0.5s"
            ref={setRef(1)}
          >
            <h1 className="mb-4 display-6">
              #1 Place To Find The Perfect Property
            </h1>
            <p className="mb-4 text-muted">
              Tempor erat elitr rebum at clita. Diam dolor diam ipsum sit. Aliqu
              diam amet diam et eos. Clita erat ipsum et lorem et sit, sed stet
              lorem sit clita duo justo magna dolore erat amet
            </p>

            {/* Liste des fonctionnalités */}
            <div className="mb-4">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className="d-flex align-items-center mb-3"
                >
                  <i
                    className={`${feature.icon} text-success me-3`}
                    style={{ fontSize: "1.2rem" }}
                  ></i>
                  <span className="text-secondary">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Bouton Read More */}
            <Button
              label="Read More"
              icon="pi pi-arrow-right"
              iconPos="right"
              className="p-button-success px-4 py-2 mt-2"
              style={{ borderRadius: "50px" }}
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --primary-color: #22c55e;
          --primary-color-hover: #16a34a;
        }

        .about-img {
          position: relative;
        }

        .about-img::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(34, 197, 94, 0.1) 0%,
            rgba(34, 197, 94, 0) 100%
          );
          border-radius: 20px;
          z-index: 1;
        }

        .about-img img {
          transition: transform 0.5s ease;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .about-img:hover img {
          transform: scale(1.02);
        }

        .display-6 {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
        }

        .text-primary {
          color: var(--primary-color) !important;
        }

        .text-success {
          color: var(--primary-color) !important;
        }

        .p-button-success {
          background: var(--primary-color);
          border: none;
          transition: all 0.3s ease;
        }

        .p-button-success:hover {
          background: var(--primary-color-hover);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(34, 197, 94, 0.3);
        }

        /* Animation Classes */
        .wow {
          opacity: 0;
          visibility: hidden;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            visibility: visible;
          }
        }

        .fadeIn {
          animation-name: fadeIn;
          animation-duration: 0.8s;
          animation-fill-mode: forwards;
          opacity: 1;
          visibility: visible;
        }

        /* Responsive */
        @media (min-width: 768px) {
          .display-6 {
            font-size: 2.5rem;
          }
        }

        @media (min-width: 992px) {
          .display-6 {
            font-size: 3rem;
          }
        }

        @media (max-width: 768px) {
          .about-img {
            margin-bottom: 2rem;
          }

          .about-img .p-5 {
            padding: 2rem !important;
          }

          .display-6 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </div>
  );
}
