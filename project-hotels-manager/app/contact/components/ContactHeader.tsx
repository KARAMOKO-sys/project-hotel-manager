"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

interface Breadcrumb {
  name: string;
  href: string;
  active?: boolean;
}

interface ContactHeaderProps {
  title?: string;
  breadcrumbs?: Breadcrumb[] | null;
  bgImage?: string | null;
}

export default function ContactHeader({
  title = "Contact Us",
  breadcrumbs = null,
  bgImage = null,
}: ContactHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const elements = entry.target.querySelectorAll(".animate-item");
            elements.forEach((el, index) => {
              setTimeout(() => {
                el.classList.add("fadeIn");
              }, index * 200);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Génération automatique des breadcrumbs basée sur la route actuelle
  const generateBreadcrumbs = (): Breadcrumb[] => {
    const pathSegments = pathname.split("/").filter((segment) => segment);
    const crumbs: Breadcrumb[] = [{ name: "Home", href: "/" }];

    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      crumbs.push({
        name: segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath,
        active: index === pathSegments.length - 1,
      });
    });

    return crumbs;
  };

  const finalBreadcrumbs: Breadcrumb[] = breadcrumbs || generateBreadcrumbs();

  return (
    <div
      className="page-header"
      ref={headerRef}
      style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
    >
      <div className="container">
        <div className="row g-0 align-items-center flex-column-reverse flex-md-row">
          <div className="col-md-6 p-5 mt-lg-5">
            <h1 className="display-5 animate-item mb-4">{title}</h1>
            <nav aria-label="breadcrumb" className="animate-item">
              <ol className="breadcrumb text-uppercase">
                {finalBreadcrumbs.map((crumb, index) => (
                  <li
                    key={index}
                    className={`breadcrumb-item ${crumb.active ? "active" : ""}`}
                  >
                    {crumb.active ? (
                      <span className="text-body">{crumb.name}</span>
                    ) : (
                      <Link href={crumb.href} className="breadcrumb-link">
                        {crumb.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          <div className="col-md-6 animate-item">
            <div className="header-image">
              <img
                className="img-fluid w-100"
                src="/img/header.jpg"
                alt={title}
              />
              <div className="header-image-overlay"></div>
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

        .page-header {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          padding: 80px 0;
          position: relative;
          overflow: hidden;
        }

        /* Background image overlay */
        .page-header[style*="backgroundImage"] {
          background-size: cover;
          background-position: center;
          position: relative;
        }

        .page-header[style*="backgroundImage"]::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(255, 255, 255, 0.9) 100%
          );
          z-index: 0;
        }

        .page-header .container {
          position: relative;
          z-index: 1;
        }

        /* Décoration de fond */
        .page-header::before {
          content: "";
          position: absolute;
          top: -30%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.08) 0%,
            rgba(34, 197, 94, 0) 70%
          );
          border-radius: 50%;
          z-index: 0;
        }

        .page-header::after {
          content: "";
          position: absolute;
          bottom: -20%;
          left: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.05) 0%,
            rgba(34, 197, 94, 0) 70%
          );
          border-radius: 50%;
          z-index: 0;
        }

        /* Titre */
        .display-5 {
          font-size: 3rem;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 1rem;
          line-height: 1.2;
          background: linear-gradient(
            135deg,
            #1f2937 0%,
            var(--primary-color) 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Breadcrumb */
        .breadcrumb {
          background: transparent;
          padding: 0;
          margin: 0;
        }

        .breadcrumb-item {
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .breadcrumb-link {
          color: var(--primary-color);
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .breadcrumb-link:hover {
          color: var(--primary-dark);
          text-decoration: underline;
        }

        .breadcrumb-item.active {
          color: #6c757d;
        }

        .breadcrumb-item + .breadcrumb-item::before {
          content: "/";
          color: #adb5bd;
          padding: 0 0.5rem;
        }

        /* Image */
        .header-image {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .header-image:hover {
          transform: translateY(-5px);
          box-shadow: 0 25px 50px rgba(34, 197, 94, 0.2);
        }

        .header-image img {
          transition: transform 0.5s ease;
          height: 450px;
          object-fit: cover;
        }

        .header-image:hover img {
          transform: scale(1.05);
        }

        .header-image-overlay {
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
          pointer-events: none;
        }

        /* Animations */
        .animate-item {
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
          .display-5 {
            font-size: 3.5rem;
          }
        }

        @media (min-width: 992px) {
          .display-5 {
            font-size: 4rem;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            padding: 50px 0;
            text-align: center;
          }

          .display-5 {
            font-size: 2rem;
          }

          .breadcrumb {
            justify-content: center;
          }

          .header-image {
            margin-top: 2rem;
          }

          .header-image img {
            height: 300px;
          }
        }

        @media (max-width: 576px) {
          .display-5 {
            font-size: 1.75rem;
          }

          .breadcrumb-item {
            font-size: 0.75rem;
          }

          .page-header .p-5 {
            padding: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
