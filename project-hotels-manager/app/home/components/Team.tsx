"use client";

import { useEffect } from "react";
import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

export default function Team() {
  useEffect(() => {
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

    const elements = document.querySelectorAll(".wow");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const teamMembers = [
    {
      id: 1,
      name: "John Doe",
      designation: "Real Estate Agent",
      image: "/img/team-1.jpg",
      delay: "0.1s",
      facebook: "https://facebook.com",
      twitter: "https://twitter.com",
      instagram: "https://instagram.com",
    },
    {
      id: 2,
      name: "Jane Smith",
      designation: "Property Consultant",
      image: "/img/team-2.jpg",
      delay: "0.3s",
      facebook: "https://facebook.com",
      twitter: "https://twitter.com",
      instagram: "https://instagram.com",
    },
    {
      id: 3,
      name: "Michael Brown",
      designation: "Real Estate Broker",
      image: "/img/team-3.jpg",
      delay: "0.5s",
      facebook: "https://facebook.com",
      twitter: "https://twitter.com",
      instagram: "https://instagram.com",
    },
    {
      id: 4,
      name: "Emily Davis",
      designation: "Property Manager",
      image: "/img/team-4.jpg",
      delay: "0.7s",
      facebook: "https://facebook.com",
      twitter: "https://twitter.com",
      instagram: "https://instagram.com",
    },
  ];

  return (
    <div className="container-xxl py-5">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mx-auto mb-5 wow fadeInUp"
          data-wow-delay="0.1s"
          style={{ maxWidth: "600px" }}
        >
          <h1 className="mb-3 display-6">Property Agents</h1>
          <p className="text-muted">
            Eirmod sed ipsum dolor sit rebum labore magna erat. Tempor ut dolore
            lorem kasd vero ipsum sit eirmod sit. Ipsum diam justo sed rebum
            vero dolor duo.
          </p>
        </div>

        {/* Team Grid */}
        <div className="row g-4">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="col-lg-3 col-md-6 wow fadeInUp"
              data-wow-delay={member.delay}
            >
              <div className="team-item rounded overflow-hidden shadow-sm">
                <div className="position-relative">
                  <img
                    className="img-fluid w-100"
                    src={member.image}
                    alt={member.name}
                    style={{ height: "300px", objectFit: "cover" }}
                  />
                  <div className="position-absolute start-50 top-100 translate-middle d-flex align-items-center gap-2">
                    <Link
                      href={member.facebook}
                      target="_blank"
                      className="btn btn-sm btn-square rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "35px",
                        height: "35px",
                        backgroundColor: "#1877f2",
                        color: "white",
                      }}
                    >
                      <i className="pi pi-facebook"></i>
                    </Link>
                    <Link
                      href={member.twitter}
                      target="_blank"
                      className="btn btn-sm btn-square rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "35px",
                        height: "35px",
                        backgroundColor: "#1da1f2",
                        color: "white",
                      }}
                    >
                      <i className="pi pi-twitter"></i>
                    </Link>
                    <Link
                      href={member.instagram}
                      target="_blank"
                      className="btn btn-sm btn-square rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "35px",
                        height: "35px",
                        background:
                          "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
                        color: "white",
                      }}
                    >
                      <i className="pi pi-instagram"></i>
                    </Link>
                  </div>
                </div>
                <div className="text-center p-4 mt-4">
                  <h5 className="fw-bold mb-1">{member.name}</h5>
                  <small className="text-muted">{member.designation}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        :root {
          --primary-color: #22c55e;
          --primary-dark: #16a34a;
        }

        .team-item {
          transition: all 0.3s ease;
          background: white;
          border: 1px solid #e5e7eb;
        }

        .team-item:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
        }

        .team-item img {
          transition: transform 0.5s ease;
        }

        .team-item:hover img {
          transform: scale(1.05);
        }

        .team-item .position-relative {
          overflow: hidden;
        }

        .team-item .position-absolute {
          transition: all 0.3s ease;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.9);
        }

        .team-item:hover .position-absolute {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }

        .btn-square {
          transition: all 0.3s ease;
        }

        .btn-square:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
        }

        .display-6 {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
        }

        /* Animations */
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
          animation-duration: 0.6s;
          animation-fill-mode: forwards;
        }

        /* Responsive */
        @media (min-width: 768px) {
          .display-6 {
            font-size: 2.5rem;
          }
        }

        @media (max-width: 768px) {
          .display-6 {
            font-size: 1.8rem;
          }

          .team-item .position-absolute {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            bottom: 20px;
            top: auto;
          }
        }
      `}</style>
    </div>
  );
}
