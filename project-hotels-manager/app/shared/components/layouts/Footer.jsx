"use client";

import { useEffect } from "react";
import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

export default function Footer() {
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

    const element = document.querySelector(".footer");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const quickLinks = [
    { name: "About Us", href: "/about" },
    { name: "Contact Us", href: "/contact" },
    { name: "Our Services", href: "/services" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms & Condition", href: "/terms" },
  ];

  const galleryImages = [
    "/img/property-1.jpg",
    "/img/property-2.jpg",
    "/img/property-3.jpg",
    "/img/property-4.jpg",
    "/img/property-5.jpg",
    "/img/property-6.jpg",
  ];

  const socialLinks = [
    { icon: "pi pi-twitter", href: "https://twitter.com", color: "#1da1f2" },
    { icon: "pi pi-facebook", href: "https://facebook.com", color: "#1877f2" },
    { icon: "pi pi-youtube", href: "https://youtube.com", color: "#ff0000" },
    { icon: "pi pi-linkedin", href: "https://linkedin.com", color: "#0a66c2" },
  ];

  const footerLinks = [
    { name: "Home", href: "/" },
    { name: "Cookies", href: "/cookies" },
    { name: "Help", href: "/help" },
    { name: "FQAs", href: "/faqs" },
  ];

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    console.log("Newsletter signup:", email);
    // Ajoutez votre logique d'inscription ici
  };

  return (
    <>
      <div
        className="container-fluid bg-dark text-white-50 footer pt-5 mt-5 wow fadeIn"
        data-wow-delay="0.1s"
      >
        <div className="container py-5">
          <div className="row g-5">
            {/* Get In Touch Section */}
            <div className="col-lg-3 col-md-6">
              <h5 className="text-white mb-4">Get In Touch</h5>
              <p className="mb-2">
                <i className="pi pi-map-marker me-3 text-white"></i>
                123 Street, New York, USA
              </p>
              <p className="mb-2">
                <i className="pi pi-phone me-3 text-white"></i>
                +012 345 67890
              </p>
              <p className="mb-2">
                <i className="pi pi-envelope me-3 text-white"></i>
                info@example.com
              </p>
              <div className="d-flex pt-2 gap-2">
                {socialLinks.map((social, index) => (
                  <Link
                    key={index}
                    href={social.href}
                    target="_blank"
                    className="btn btn-outline-light btn-social rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: "38px", height: "38px" }}
                  >
                    <i className={social.icon}></i>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Links Section */}
            <div className="col-lg-3 col-md-6">
              <h5 className="text-white mb-4">Quick Links</h5>
              {quickLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="btn btn-link text-white-50 text-decoration-none d-block text-start ps-0 mb-2"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Photo Gallery Section */}
            <div className="col-lg-3 col-md-6">
              <h5 className="text-white mb-4">Photo Gallery</h5>
              <div className="row g-2 pt-2">
                {galleryImages.map((image, index) => (
                  <div key={index} className="col-4">
                    <img
                      className="img-fluid rounded bg-light p-1 w-100"
                      src={image}
                      alt={`Gallery ${index + 1}`}
                      style={{ height: "80px", objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Newsletter Section */}
            <div className="col-lg-3 col-md-6">
              <h5 className="text-white mb-4">Newsletter</h5>
              <p className="mb-3">
                Dolor amet sit justo amet elitr clita ipsum elitr est.
              </p>
              <form onSubmit={handleNewsletterSubmit}>
                <div
                  className="position-relative mx-auto"
                  style={{ maxWidth: "400px" }}
                >
                  <input
                    type="email"
                    className="form-control bg-transparent w-100 py-3 ps-4 pe-5 text-white"
                    placeholder="Your email"
                    required
                    style={{ border: "1px solid rgba(255,255,255,0.2)" }}
                  />
                  <button
                    type="submit"
                    className="btn btn-success py-2 position-absolute top-0 end-0 mt-2 me-2"
                  >
                    SignUp
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="container">
          <div className="copyright py-4 border-top border-secondary">
            <div className="row">
              <div className="col-md-6 text-center text-md-start mb-3 mb-md-0">
                &copy;{" "}
                <Link
                  href="/"
                  className="border-bottom text-white-50 text-decoration-none"
                >
                  Your Site Name
                </Link>
                , All Right Reserved.
                <br className="d-md-none" />
                <span className="d-none d-md-inline"> </span>
                Designed By{" "}
                <Link
                  href="https://htmlcodex.com"
                  target="_blank"
                  className="border-bottom text-white-50 text-decoration-none"
                >
                  HTML Codex
                </Link>
              </div>
              <div className="col-md-6 text-center text-md-end">
                <div className="footer-menu d-flex gap-3 justify-content-center justify-content-md-end">
                  {footerLinks.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      className="text-white-50 text-decoration-none"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <Link
        href="#"
        className="btn btn-success btn-lg-square back-to-top rounded-circle d-flex align-items-center justify-content-center"
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "50px",
          height: "50px",
          zIndex: "99",
          backgroundColor: "#22c55e",
          border: "none",
        }}
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <i className="pi pi-arrow-up text-white"></i>
      </Link>

      <style jsx global>{`
        :root {
          --primary-color: #22c55e;
          --primary-dark: #16a34a;
        }

        .footer {
          background-color: #1f2937;
        }

        .footer .btn-link {
          display: block;
          padding: 0;
          transition: all 0.3s ease;
        }

        .footer .btn-link:hover {
          color: var(--primary-color) !important;
          transform: translateX(5px);
        }

        .footer .btn-social {
          transition: all 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .footer .btn-social:hover {
          background: var(--primary-color);
          border-color: var(--primary-color);
          transform: translateY(-3px);
        }

        .footer .btn-social i {
          font-size: 1rem;
        }

        .footer .form-control {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
        }

        .footer .form-control:focus {
          box-shadow: none;
          border-color: var(--primary-color);
          background: transparent;
        }

        .footer .form-control::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .footer .btn-success {
          background: var(--primary-color);
          border: none;
          transition: all 0.3s ease;
        }

        .footer .btn-success:hover {
          background: var(--primary-dark);
        }

        .copyright {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-menu a {
          transition: all 0.3s ease;
        }

        .footer-menu a:hover {
          color: var(--primary-color) !important;
        }

        .back-to-top {
          transition: all 0.3s ease;
        }

        .back-to-top:hover {
          transform: translateY(-5px);
          background-color: var(--primary-dark) !important;
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
        @media (max-width: 768px) {
          .footer .btn-link {
            text-align: center;
          }

          .copyright {
            text-align: center;
          }

          .footer-menu {
            justify-content: center !important;
          }

          .back-to-top {
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </>
  );
}
