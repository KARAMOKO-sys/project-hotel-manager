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

interface AboutHeaderProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
}

export default function AboutHeader({ title, breadcrumbs }: AboutHeaderProps) {
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

  // Breadcrumbs par défaut basés sur la route actuelle
  const defaultBreadcrumbs = (): Breadcrumb[] => {
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

  const finalBreadcrumbs: Breadcrumb[] = breadcrumbs || defaultBreadcrumbs();

  return (
    <div className="page-header" ref={headerRef}>
      <div className="container">
        <div className="row g-0 align-items-center flex-column-reverse flex-md-row">
          <div className="col-md-6 p-5 mt-lg-5">
            <h1 className="display-5 animate-item mb-4">
              {title || "About Us"}
            </h1>
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
                      <Link href={crumb.href} className="text-decoration-none">
                        {crumb.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          <div className="col-md-6 animate-item">
            <img
              className="img-fluid w-100"
              src="/img/header.jpg"
              alt={title || "Page Header"}
              style={{ height: "400px", objectFit: "cover" }}
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .page-header {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          padding: 60px 0;
          position: relative;
          overflow: hidden;
        }

        .page-header::before {
          content: "";
          position: absolute;
          top: -30%;
          right: -10%;
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

        .page-header::after {
          content: "";
          position: absolute;
          bottom: -20%;
          left: -10%;
          width: 350px;
          height: 350px;
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.03) 0%,
            rgba(34, 197, 94, 0) 70%
          );
          border-radius: 50%;
          z-index: 0;
        }

        .page-header .container {
          position: relative;
          z-index: 1;
        }

        .display-5 {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #1f2937 0%, #22c55e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Breadcrumb Styles */
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

        .breadcrumb-item a {
          color: #22c55e;
          transition: all 0.3s ease;
        }

        .breadcrumb-item a:hover {
          color: #16a34a;
          text-decoration: underline !important;
        }

        .breadcrumb-item.active {
          color: #6c757d;
        }

        .breadcrumb-item + .breadcrumb-item::before {
          content: "/";
          color: #adb5bd;
          padding: 0 0.5rem;
        }

        /* Image Styles */
        .page-header img {
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .page-header img:hover {
          transform: scale(1.02);
          box-shadow: 0 25px 50px rgba(34, 197, 94, 0.15);
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
            font-size: 3rem;
          }
        }

        @media (min-width: 992px) {
          .display-5 {
            font-size: 3.5rem;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            padding: 40px 0;
            text-align: center;
          }

          .display-5 {
            font-size: 2rem;
          }

          .breadcrumb {
            justify-content: center;
          }

          .page-header img {
            margin-top: 2rem;
            height: 300px !important;
          }
        }
      `}</style>
    </div>
  );
}
