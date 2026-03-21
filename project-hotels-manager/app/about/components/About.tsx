"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

export default function About() {
  const aboutRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fonction utilitaire pour définir les refs
  const setRef = (index: number) => (el: HTMLDivElement | null) => {
    aboutRefs.current[index] = el;
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

    aboutRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const features = [
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
    <div className="about-section">
      <div className="container">
        <div className="row g-5 align-items-center">
          {/* Image à gauche */}
          <div
            className="col-lg-6 wow fadeIn"
            data-wow-delay="0.1s"
            ref={setRef(0)}
          >
            <div className="about-img-wrapper">
              <div className="about-img">
                <img
                  className="img-fluid w-100"
                  src="/img/about.jpg"
                  alt="About Us"
                />
                <div className="experience-badge">
                  <div className="experience-number">15+</div>
                  <div className="experience-text">Years of Experience</div>
                </div>
              </div>
            </div>
          </div>

          {/* Texte à droite */}
          <div
            className="col-lg-6 wow fadeIn"
            data-wow-delay="0.5s"
            ref={setRef(1)}
          >
            <div className="about-content">
              <span className="about-badge">About Us</span>
              <h1 className="about-title">
                #1 Place To Find The Perfect Property
              </h1>
              <p className="about-description">
                Tempor erat elitr rebum at clita. Diam dolor diam ipsum sit.
                Aliqu diam amet diam et eos. Clita erat ipsum et lorem et sit,
                sed stet lorem sit clita duo justo magna dolore erat amet
              </p>

              {/* Liste des fonctionnalités */}
              <div className="features-list">
                {features.map((feature) => (
                  <div key={feature.id} className="feature-item">
                    <div className="feature-icon">
                      <i className={`${feature.icon}`}></i>
                    </div>
                    <span className="feature-text">{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Bouton Read More */}
              <Link href="/about" className="btn-read-more">
                Read More
                <i className="pi pi-arrow-right ms-2"></i>
              </Link>
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

        .about-section {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          padding: 80px 0;
          position: relative;
          overflow: hidden;
        }

        .about-section::before {
          content: "";
          position: absolute;
          top: -20%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.03) 0%,
            rgba(34, 197, 94, 0) 70%
          );
          border-radius: 50%;
          z-index: 0;
        }

        .about-section::after {
          content: "";
          position: absolute;
          bottom: -20%;
          right: -10%;
          width: 450px;
          height: 450px;
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.02) 0%,
            rgba(34, 197, 94, 0) 70%
          );
          border-radius: 50%;
          z-index: 0;
        }

        /* Image Styles */
        .about-img-wrapper {
          position: relative;
          z-index: 1;
        }

        .about-img {
          position: relative;
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .about-img:hover {
          transform: translateY(-5px);
          box-shadow: 0 30px 60px rgba(34, 197, 94, 0.15);
        }

        .about-img img {
          transition: transform 0.5s ease;
        }

        .about-img:hover img {
          transform: scale(1.02);
        }

        .experience-badge {
          position: absolute;
          bottom: 30px;
          right: 30px;
          background: linear-gradient(
            135deg,
            var(--primary-color) 0%,
            var(--primary-dark) 100%
          );
          padding: 1rem 1.5rem;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(34, 197, 94, 0.3);
          animation: pulse 2s infinite;
        }

        .experience-number {
          font-size: 2rem;
          font-weight: 800;
          color: white;
          line-height: 1;
        }

        .experience-text {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Content Styles */
        .about-content {
          position: relative;
          z-index: 1;
        }

        .about-badge {
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

        .about-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 1.5rem;
          line-height: 1.2;
        }

        .about-description {
          color: #6c757d;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        /* Features List */
        .features-list {
          margin-bottom: 2rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          transform: translateX(5px);
        }

        .feature-icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(34, 197, 94, 0.1);
          border-radius: 50%;
        }

        .feature-icon i {
          color: var(--primary-color);
          font-size: 1rem;
        }

        .feature-text {
          color: #4b5563;
          font-size: 1rem;
        }

        /* Read More Button */
        .btn-read-more {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(
            135deg,
            var(--primary-color) 0%,
            var(--primary-dark) 100%
          );
          color: white;
          padding: 0.8rem 2rem;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }

        .btn-read-more:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
          color: white;
        }

        /* Animations */
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

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
          .about-title {
            font-size: 3rem;
          }
        }

        @media (min-width: 992px) {
          .about-title {
            font-size: 3.5rem;
          }
        }

        @media (max-width: 768px) {
          .about-section {
            padding: 60px 0;
            text-align: center;
          }

          .about-title {
            font-size: 2rem;
          }

          .about-badge {
            margin: 0 auto 1rem auto;
          }

          .features-list {
            text-align: left;
            max-width: 300px;
            margin: 0 auto 2rem auto;
          }

          .experience-badge {
            bottom: 20px;
            right: 20px;
            padding: 0.8rem 1.2rem;
          }

          .experience-number {
            font-size: 1.5rem;
          }

          .experience-text {
            font-size: 0.65rem;
          }
        }

        @media (max-width: 576px) {
          .about-title {
            font-size: 1.75rem;
          }

          .feature-text {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}
