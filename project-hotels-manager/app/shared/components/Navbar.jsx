"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "primereact/button";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/", icon: "pi pi-home" },
    { name: "About", href: "/about", icon: "pi pi-info-circle" },
    {
      name: "Property",
      href: "/property-list",
      icon: "pi pi-building",
      hasDropdown: true,
    },
    { name: "Pages", href: "#", icon: "pi pi-folder", hasDropdown: true },
    { name: "Contact", href: "/contact", icon: "pi pi-envelope" },
  ];

  const propertyDropdown = [
    { name: "Property List", href: "/property-list", icon: "pi pi-list" },
    { name: "Property Type", href: "/property-type", icon: "pi pi-tags" },
    { name: "Property Agent", href: "/property-agent", icon: "pi pi-users" },
  ];

  const pagesDropdown = [
    { name: "Testimonial", href: "/testimonial", icon: "pi pi-star" },
    { name: "404 Error", href: "/404", icon: "pi pi-exclamation-triangle" },
  ];

  const isActive = (path) => {
    if (path === "/") return pathname === path;
    return pathname.startsWith(path);
  };

  return (
    <>
      <nav
        className={`navbar navbar-expand-lg fixed-top ${
          isScrolled ? "navbar-scrolled" : "navbar-transparent"
        }`}
        style={{
          transition: "all 0.3s ease",
          padding: isScrolled ? "0.5rem 0" : "1rem 0",
          backgroundColor: isScrolled ? "white" : "transparent",
        }}
      >
        <div className="container">
          {/* Logo */}
          <Link href="/" className="navbar-brand d-flex align-items-center">
            <div className="logo-icon me-2">
              <img
                src="/img/icon-deal.png"
                alt="Logo"
                style={{ width: "35px", height: "35px" }}
              />
            </div>
            <h1
              className="m-0"
              style={{
                fontSize: "1.8rem",
                fontWeight: "700",
                color: "#22c55e",
                transition: "color 0.3s ease",
              }}
            >
              Makaan
            </h1>
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="navbar-toggler border-0"
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              backgroundColor: "#22c55e",
              boxShadow: "0 2px 10px rgba(34, 197, 94, 0.3)",
            }}
          >
            <span
              className="navbar-toggler-icon"
              style={{ filter: "brightness(0) invert(1)" }}
            ></span>
          </button>

          {/* Navigation Links */}
          <div
            className={`collapse navbar-collapse ${isMobileMenuOpen ? "show" : ""}`}
            style={{ transition: "all 0.3s ease" }}
          >
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
              {navLinks.map((link) => (
                <li key={link.name} className="nav-item dropdown">
                  {link.hasDropdown ? (
                    <>
                      <a
                        className={`nav-link dropdown-toggle ${
                          pathname.startsWith(link.href) ? "active" : ""
                        }`}
                        href="#"
                        role="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        style={{
                          color: "#22c55e",
                          fontWeight: "500",
                          padding: "0.5rem 1rem",
                          transition: "color 0.3s ease",
                        }}
                      >
                        <i className={`${link.icon} me-1`}></i>
                        {link.name}
                      </a>
                      <ul className="dropdown-menu dropdown-menu-end border-0 rounded-3 mt-2">
                        {link.name === "Property" &&
                          propertyDropdown.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className="dropdown-item py-2"
                              >
                                <i
                                  className={`${item.icon} me-2 text-success`}
                                ></i>
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        {link.name === "Pages" &&
                          pagesDropdown.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className="dropdown-item py-2"
                              >
                                <i
                                  className={`${item.icon} me-2 text-success`}
                                ></i>
                                {item.name}
                              </Link>
                            </li>
                          ))}
                      </ul>
                    </>
                  ) : (
                    <Link
                      href={link.href}
                      className={`nav-link ${
                        isActive(link.href) ? "active" : ""
                      }`}
                      style={{
                        color: "#22c55e",
                        fontWeight: "500",
                        padding: "0.5rem 1rem",
                        transition: "color 0.3s ease",
                      }}
                    >
                      <i className={`${link.icon} me-1`}></i>
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {/* Add Property Button */}
            <Button
              label="Add Property"
              icon="pi pi-plus"
              className="add-property-btn"
              style={{
                background: "#22c55e",
                border: "none",
                borderRadius: "50px",
                padding: "0.6rem 1.5rem",
                fontWeight: "500",
                transition: "all 0.3s ease",
                color: "white",
              }}
            />
          </div>
        </div>
      </nav>

      {/* Spacer pour éviter que le contenu soit caché sous la navbar */}
      <div style={{ height: "80px" }}></div>

      <style jsx global>{`
        /* Navbar Styles */
        .navbar {
          transition: all 0.3s ease;
          box-shadow: 0 15px 40px rgba(34, 197, 94, 0.35);
        }

        .navbar-transparent {
          background: linear-gradient(
            135deg,
            rgba(34, 197, 94, 0.15) 0%,
            rgba(34, 197, 94, 0.05) 100%
          );
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 35px rgba(34, 197, 94, 0.45);
        }

        .navbar-scrolled {
          background: rgba(255, 255, 255, 0.98) !important;
          box-shadow:
            0 20px 50px rgba(34, 197, 94, 0.4),
            0 8px 20px rgba(34, 197, 94, 0.25);
        }

        /* Container Styles */
        .navbar .container {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 60px;
          padding: 0.5rem 1.5rem;
          backdrop-filter: blur(5px);
          transition: all 0.3s ease;
          box-shadow: 0 5px 20px rgba(34, 197, 94, 0.2);
        }

        .navbar-scrolled .container {
          background: white;
          border-radius: 0;
          padding: 0.5rem 1rem;
          box-shadow: none;
        }

        .navbar-transparent .container {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.3);
        }

        /* Navbar Brand */
        .navbar-brand {
          transition: all 0.3s ease;
        }

        .navbar-brand:hover {
          transform: scale(1.02);
        }

        /* Nav Links */
        .nav-link {
          position: relative;
          transition: all 0.3s ease;
          color: #22c55e !important;
        }

        .nav-link:hover {
          color: #16a34a !important;
          transform: translateY(-2px);
        }

        .nav-link.active {
          color: #16a34a !important;
          font-weight: 600;
        }

        .nav-link.active::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 3px;
          background: #22c55e;
          border-radius: 3px;
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.8);
        }

        /* Dropdown Styles */
        .dropdown-menu {
          animation: fadeInDown 0.3s ease;
          min-width: 220px;
          padding: 0.5rem 0;
          box-shadow:
            0 25px 50px rgba(34, 197, 94, 0.35),
            0 8px 20px rgba(34, 197, 94, 0.2);
          border: none;
          background: white;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-item {
          transition: all 0.3s ease;
          padding: 0.6rem 1.5rem;
          color: #22c55e !important;
        }

        .dropdown-item:hover {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a !important;
          transform: translateX(5px);
        }

        .dropdown-item i {
          width: 20px;
          color: #22c55e;
        }

        /* Add Property Button */
        .add-property-btn {
          background: #22c55e !important;
          border: none !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.55);
          color: white !important;
        }

        .add-property-btn:hover {
          background: #16a34a !important;
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(34, 197, 94, 0.7);
        }

        /* Mobile Menu */
        @media (max-width: 991px) {
          .navbar .container {
            background: white;
            border-radius: 20px;
            padding: 0.5rem 1rem;
            box-shadow: 0 5px 20px rgba(34, 197, 94, 0.25);
          }

          .navbar-collapse {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            padding: 1rem;
            border-radius: 0 0 20px 20px;
            box-shadow: 0 30px 60px rgba(34, 197, 94, 0.35);
            z-index: 1000;
          }

          .navbar-transparent .navbar-collapse {
            background: white;
          }

          .nav-link {
            color: #22c55e !important;
            padding: 0.75rem 1rem !important;
          }

          .nav-link.active::after {
            display: none;
          }

          .dropdown-menu {
            border: none;
            background: #f8f9fa;
            padding-left: 1.5rem;
            box-shadow: none;
          }

          .dropdown-item {
            color: #22c55e !important;
          }

          .add-property-btn {
            width: 100%;
            margin-top: 0.5rem;
            box-shadow: 0 8px 25px rgba(34, 197, 94, 0.5);
          }

          .navbar-toggler:focus {
            box-shadow: none;
          }
        }

        /* Desktop hover effect */
        @media (min-width: 992px) {
          .navbar {
            margin-top: 15px;
            margin-left: 20px;
            margin-right: 20px;
            width: calc(100% - 40px);
            left: 0;
            right: 0;
          }

          .navbar .container {
            border-radius: 60px;
          }

          .navbar-scrolled {
            margin-top: 0;
            margin-left: 0;
            margin-right: 0;
          }

          .navbar-scrolled .container {
            border-radius: 0;
          }

          .navbar-transparent {
            margin-top: 15px;
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .navbar-brand h1 {
            font-size: 1.4rem !important;
          }

          .navbar-brand img {
            width: 28px !important;
            height: 28px !important;
          }

          .navbar {
            margin-top: 0;
            border-radius: 0;
            width: 100%;
          }

          .navbar .container {
            border-radius: 0;
          }
        }

        @media (max-width: 576px) {
          .navbar-brand h1 {
            font-size: 1.2rem !important;
          }
        }
      `}</style>
    </>
  );
}
