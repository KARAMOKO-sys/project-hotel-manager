"use client";

import { useEffect } from "react";
import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

export default function CallToAction() {
  useEffect(() => {
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

    const elements = document.querySelectorAll(".wow");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="container-xxl py-5">
      <div className="container">
        <div className="bg-light rounded p-3">
          <div
            className="bg-white rounded p-4"
            style={{ border: "1px dashed rgba(34, 197, 94, 0.3)" }}
          >
            <div className="row g-5 align-items-center">
              {/* Image à gauche */}
              <div className="col-lg-6 wow fadeIn" data-wow-delay="0.1s">
                <img
                  className="img-fluid rounded w-100"
                  src="/img/call-to-action.jpg"
                  alt="Call to Action"
                  style={{
                    objectFit: "cover",
                    height: "100%",
                    minHeight: "300px",
                  }}
                />
              </div>

              {/* Texte et boutons à droite */}
              <div className="col-lg-6 wow fadeIn" data-wow-delay="0.5s">
                <div className="mb-4">
                  <h1 className="mb-3 display-6">
                    Contact With Our Certified Agent
                  </h1>
                  <p className="text-muted">
                    Eirmod sed ipsum dolor sit rebum magna erat. Tempor lorem
                    kasd vero ipsum sit sit diam justo sed vero dolor duo.
                  </p>
                </div>
                <div className="d-flex gap-3 flex-wrap">
                  <Link
                    href="/contact"
                    className="btn btn-success py-3 px-4 d-inline-flex align-items-center gap-2"
                  >
                    <i className="pi pi-phone"></i>
                    Make A Call
                  </Link>
                  <Link
                    href="/appointment"
                    className="btn btn-dark py-3 px-4 d-inline-flex align-items-center gap-2"
                  >
                    <i className="pi pi-calendar"></i>
                    Get Appointment
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --primary-color: #22c55e;
          --primary-dark: #16a34a;
        }

        .bg-light {
          background-color: #f8f9fa !important;
        }

        .bg-white {
          background-color: #ffffff !important;
        }

        .btn-success {
          background-color: var(--primary-color);
          border: none;
          transition: all 0.3s ease;
        }

        .btn-success:hover {
          background-color: var(--primary-dark);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(34, 197, 94, 0.3);
        }

        .btn-dark {
          background-color: #1f2937;
          border: none;
          transition: all 0.3s ease;
        }

        .btn-dark:hover {
          background-color: #111827;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .display-6 {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1f2937;
        }

        /* Animations */
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
        }

        /* Responsive */
        @media (min-width: 768px) {
          .display-6 {
            font-size: 2rem;
          }
        }

        @media (min-width: 992px) {
          .display-6 {
            font-size: 2.5rem;
          }
        }

        @media (max-width: 768px) {
          .bg-white .rounded {
            text-align: center;
          }

          .display-6 {
            font-size: 1.5rem;
          }

          .btn-success,
          .btn-dark {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
