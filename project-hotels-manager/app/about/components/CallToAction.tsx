"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

export default function CallToAction() {
  const ctaRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fonction utilitaire pour définir les refs
  const setRef = (index: number) => (el: HTMLDivElement | null) => {
    ctaRefs.current[index] = el;
  };

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

    ctaRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="call-to-action-section">
      <div className="container">
        <div className="cta-wrapper">
          <div className="cta-inner">
            <div className="row g-5 align-items-center">
              {/* Image à gauche */}
              <div
                className="col-lg-6 wow fadeIn"
                data-wow-delay="0.1s"
                ref={setRef(0)}
              >
                <div className="cta-image">
                  <img
                    className="img-fluid rounded w-100"
                    src="/img/call-to-action.jpg"
                    alt="Call to Action"
                  />
                  <div className="cta-image-overlay">
                    <div className="play-button">
                      <i className="pi pi-play"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Texte et boutons à droite */}
              <div
                className="col-lg-6 wow fadeIn"
                data-wow-delay="0.5s"
                ref={setRef(1)}
              >
                <div className="cta-content">
                  <span className="cta-badge">Need Help?</span>
                  <h1 className="cta-title">
                    Contact With Our Certified Agent
                  </h1>
                  <p className="cta-description">
                    Eirmod sed ipsum dolor sit rebum magna erat. Tempor lorem
                    kasd vero ipsum sit sit diam justo sed vero dolor duo.
                  </p>
                  <div className="cta-buttons">
                    <Link href="/contact" className="btn-call">
                      <i className="pi pi-phone me-2"></i>
                      Make A Call
                    </Link>
                    <Link href="/appointment" className="btn-appointment">
                      <i className="pi pi-calendar me-2"></i>
                      Get Appointment
                    </Link>
                  </div>

                  {/* Statistiques supplémentaires */}
                  <div className="cta-stats">
                    <div className="stat">
                      <div className="stat-number">24/7</div>
                      <div className="stat-label">Support</div>
                    </div>
                    <div className="stat">
                      <div className="stat-number">100%</div>
                      <div className="stat-label">Satisfaction</div>
                    </div>
                    <div className="stat">
                      <div className="stat-number">30min</div>
                      <div className="stat-label">Response</div>
                    </div>
                  </div>
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
          --primary-light: #86efac;
        }

        .call-to-action-section {
          padding: 80px 0;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          position: relative;
          overflow: hidden;
        }

        .call-to-action-section::before {
          content: "";
          position: absolute;
          top: -30%;
          right: -10%;
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

        .call-to-action-section::after {
          content: "";
          position: absolute;
          bottom: -20%;
          left: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.03) 0%,
            rgba(34, 197, 94, 0) 70%
          );
          border-radius: 50%;
          z-index: 0;
        }

        /* Wrapper Styles */
        .cta-wrapper {
          position: relative;
          z-index: 1;
        }

        .cta-inner {
          background: white;
          border-radius: 30px;
          padding: 2rem;
          border: 1px dashed rgba(34, 197, 94, 0.3);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .cta-inner:hover {
          box-shadow: 0 20px 40px rgba(34, 197, 94, 0.1);
        }

        /* Image Styles */
        .cta-image {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .cta-image:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(34, 197, 94, 0.2);
        }

        .cta-image img {
          transition: transform 0.5s ease;
          height: 400px;
          object-fit: cover;
        }

        .cta-image:hover img {
          transform: scale(1.05);
        }

        .cta-image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .cta-image:hover .cta-image-overlay {
          opacity: 1;
        }

        .play-button {
          width: 70px;
          height: 70px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .play-button i {
          color: var(--primary-color);
          font-size: 1.5rem;
          margin-left: 5px;
        }

        .play-button:hover {
          transform: scale(1.1);
          box-shadow: 0 10px 25px rgba(34, 197, 94, 0.3);
        }

        /* Content Styles */
        .cta-content {
          position: relative;
          z-index: 1;
        }

        .cta-badge {
          display: inline-block;
          background: rgba(34, 197, 94, 0.1);
          padding: 0.4rem 1rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--primary-color);
          margin-bottom: 1rem;
        }

        .cta-title {
          font-size: 2rem;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .cta-description {
          color: #6c757d;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        /* Buttons */
        .cta-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }

        .btn-call {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(
            135deg,
            var(--primary-color) 0%,
            var(--primary-dark) 100%
          );
          color: white;
          padding: 0.8rem 1.8rem;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-call:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
          color: white;
        }

        .btn-appointment {
          display: inline-flex;
          align-items: center;
          background: #1f2937;
          color: white;
          padding: 0.8rem 1.8rem;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-appointment:hover {
          background: #111827;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          color: white;
        }

        /* Stats */
        .cta-stats {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .stat {
          text-align: center;
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--primary-color);
          line-height: 1;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 1px;
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
          animation: fadeIn 0.6s ease forwards;
        }

        /* Responsive */
        @media (min-width: 768px) {
          .cta-title {
            font-size: 2.5rem;
          }
        }

        @media (min-width: 992px) {
          .cta-title {
            font-size: 3rem;
          }
        }

        @media (max-width: 768px) {
          .call-to-action-section {
            padding: 60px 0;
          }

          .cta-inner {
            padding: 1.5rem;
          }

          .cta-title {
            font-size: 1.8rem;
            text-align: center;
          }

          .cta-description {
            text-align: center;
          }

          .cta-badge {
            margin: 0 auto 1rem auto;
            display: table;
          }

          .cta-buttons {
            justify-content: center;
          }

          .cta-stats {
            justify-content: center;
          }

          .cta-image img {
            height: 300px;
          }
        }

        @media (max-width: 576px) {
          .cta-title {
            font-size: 1.5rem;
          }

          .btn-call,
          .btn-appointment {
            width: 100%;
            justify-content: center;
          }

          .cta-stats {
            gap: 1rem;
          }

          .stat-number {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}
