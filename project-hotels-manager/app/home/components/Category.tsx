"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";

interface Category {
  id: number;
  name: string;
  icon: string;
  properties: number;
  delay: number;
}

export default function Category() {
  const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fonction utilitaire pour définir les refs
  const setRef = (index: number) => (el: HTMLDivElement | null) => {
    categoryRefs.current[index] = el;
  };

  useEffect(() => {
    // Observer pour les animations au scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fadeInUp");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    categoryRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const categories: Category[] = [
    {
      id: 1,
      name: "Apartment",
      icon: "/img/icon-apartment.png",
      properties: 123,
      delay: 100,
    },
    {
      id: 2,
      name: "Villa",
      icon: "/img/icon-villa.png",
      properties: 123,
      delay: 300,
    },
    {
      id: 3,
      name: "Home",
      icon: "/img/icon-house.png",
      properties: 123,
      delay: 500,
    },
    {
      id: 4,
      name: "Office",
      icon: "/img/icon-housing.png",
      properties: 123,
      delay: 700,
    },
    {
      id: 5,
      name: "Building",
      icon: "/img/icon-building.png",
      properties: 123,
      delay: 100,
    },
    {
      id: 6,
      name: "Townhouse",
      icon: "/img/icon-neighborhood.png",
      properties: 123,
      delay: 300,
    },
    {
      id: 7,
      name: "Shop",
      icon: "/img/icon-condominium.png",
      properties: 123,
      delay: 500,
    },
    {
      id: 8,
      name: "Garage",
      icon: "/img/icon-luxury.png",
      properties: 123,
      delay: 700,
    },
  ];

  return (
    <div className="container-xxl py-5">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mx-auto mb-5" style={{ maxWidth: "600px" }}>
          <h1 className="mb-3">Property Types</h1>
          <p className="text-muted">
            Eirmod sed ipsum dolor sit rebum labore magna erat. Tempor ut dolore
            lorem kasd vero ipsum sit eirmod sit. Ipsum diam justo sed rebum
            vero dolor duo.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="row g-4">
          {categories.map((category, index) => (
            <div
              key={category.id}
              ref={setRef(index)}
              className="col-lg-3 col-sm-6 wow"
              style={{ animationDelay: `${category.delay}ms` }}
            >
              <Link
                href={`/property-type/${category.name.toLowerCase()}`}
                className="cat-item d-block bg-light text-center rounded p-3 text-decoration-none"
              >
                <div className="rounded p-4">
                  <div className="icon mb-3">
                    <img
                      className="img-fluid"
                      src={category.icon}
                      alt={category.name}
                      style={{ width: "60px", height: "60px" }}
                    />
                  </div>
                  <h6 className="mb-2">{category.name}</h6>
                  <span className="text-muted">
                    {category.properties} Properties
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        :root {
          --primary-color: #22c55e;
          --primary-color-hover: #16a34a;
        }

        .cat-item {
          transition: all 0.3s ease;
          border: 1px solid #e5e7eb;
          background: #f9fafb !important;
        }

        .cat-item:hover {
          background: var(--primary-color) !important;
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(34, 197, 94, 0.2);
          border-color: transparent;
        }

        .cat-item:hover h6,
        .cat-item:hover span {
          color: white !important;
        }

        .cat-item:hover .icon img {
          filter: brightness(0) invert(1);
        }

        .cat-item h6 {
          color: #1f2937;
          transition: color 0.3s ease;
          font-weight: 600;
        }

        .cat-item span {
          transition: color 0.3s ease;
          font-size: 0.875rem;
        }

        .icon img {
          transition: filter 0.3s ease;
        }

        /* Animation Classes */
        .wow {
          opacity: 0;
          visibility: hidden;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate3d(0, 40px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            visibility: visible;
          }
        }

        .fadeInUp {
          animation-name: fadeInUp;
          animation-duration: 0.8s;
          animation-fill-mode: forwards;
          opacity: 1;
          visibility: visible;
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .container-xxl.py-5 {
            padding: 3rem 0;
          }

          .cat-item .rounded.p-4 {
            padding: 1.5rem !important;
          }

          .icon img {
            width: 50px;
            height: 50px;
          }
        }

        @media (max-width: 576px) {
          .cat-item .rounded.p-4 {
            padding: 1rem !important;
          }

          .icon img {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
}
