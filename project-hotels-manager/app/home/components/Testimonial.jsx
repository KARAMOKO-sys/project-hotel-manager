"use client";

import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

export default function Testimonial() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials = [
    {
      id: 1,
      name: "John Doe",
      profession: "Homeowner",
      image: "/img/testimonial-1.jpg",
      text: "Tempor stet labore dolor clita stet diam amet ipsum dolor duo ipsum rebum stet dolor amet diam stet. Est stet ea lorem amet est kasd kasd erat eos",
    },
    {
      id: 2,
      name: "Jane Smith",
      profession: "Investor",
      image: "/img/testimonial-2.jpg",
      text: "Tempor stet labore dolor clita stet diam amet ipsum dolor duo ipsum rebum stet dolor amet diam stet. Est stet ea lorem amet est kasd kasd erat eos",
    },
    {
      id: 3,
      name: "Michael Brown",
      profession: "Property Developer",
      image: "/img/testimonial-3.jpg",
      text: "Tempor stet labore dolor clita stet diam amet ipsum dolor duo ipsum rebum stet dolor amet diam stet. Est stet ea lorem amet est kasd kasd erat eos",
    },
    {
      id: 4,
      name: "Emily Davis",
      profession: "Real Estate Agent",
      image: "/img/testimonial-4.jpg",
      text: "Tempor stet labore dolor clita stet diam amet ipsum dolor duo ipsum rebum stet dolor amet diam stet. Est stet ea lorem amet est kasd kasd erat eos",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [testimonials.length]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1,
    );
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="container-xxl py-5">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mx-auto mb-5 wow fadeInUp"
          style={{ maxWidth: "600px" }}
        >
          <h1 className="mb-3 display-6">Our Clients Say!</h1>
          <p className="text-muted">
            Eirmod sed ipsum dolor sit rebum labore magna erat. Tempor ut dolore
            lorem kasd vero ipsum sit eirmod sit. Ipsum diam justo sed rebum
            vero dolor duo.
          </p>
        </div>

        {/* Carrousel */}
        <div className="testimonial-carousel position-relative">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="testimonial-item bg-light rounded p-3">
                <div className="bg-white border rounded p-4">
                  <p className="mb-4 fst-italic text-muted">
                    "{testimonials[currentIndex].text}"
                  </p>
                  <div className="d-flex align-items-center">
                    <img
                      className="img-fluid flex-shrink-0 rounded-circle"
                      src={testimonials[currentIndex].image}
                      alt={testimonials[currentIndex].name}
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                      }}
                    />
                    <div className="ps-3">
                      <h6 className="fw-bold mb-1">
                        {testimonials[currentIndex].name}
                      </h6>
                      <small className="text-muted">
                        {testimonials[currentIndex].profession}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            className="carousel-control-prev position-absolute top-50 start-0 translate-middle-y"
            onClick={prevSlide}
            style={{
              background: "var(--primary-color)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              left: "-20px",
            }}
          >
            <i className="pi pi-chevron-left text-white"></i>
          </button>
          <button
            className="carousel-control-next position-absolute top-50 end-0 translate-middle-y"
            onClick={nextSlide}
            style={{
              background: "var(--primary-color)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              right: "-20px",
            }}
          >
            <i className="pi pi-chevron-right text-white"></i>
          </button>

          {/* Indicators */}
          <div className="d-flex justify-content-center gap-2 mt-4">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="rounded-circle"
                style={{
                  width: "10px",
                  height: "10px",
                  padding: "0",
                  border: "none",
                  backgroundColor:
                    currentIndex === index ? "var(--primary-color)" : "#ddd",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --primary-color: #22c55e;
          --primary-dark: #16a34a;
        }

        .testimonial-item {
          transition: all 0.3s ease;
        }

        .testimonial-item:hover {
          transform: translateY(-5px);
        }

        .carousel-control-prev,
        .carousel-control-next {
          opacity: 1;
          transition: all 0.3s ease;
          cursor: pointer;
          z-index: 10;
        }

        .carousel-control-prev:hover,
        .carousel-control-next:hover {
          background: var(--primary-dark) !important;
          transform: translateY(-50%) scale(1.1);
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

          .carousel-control-prev {
            left: -10px !important;
          }

          .carousel-control-next {
            right: -10px !important;
          }

          .carousel-control-prev,
          .carousel-control-next {
            width: 35px !important;
            height: 35px !important;
          }

          .testimonial-item .bg-white {
            padding: 1.5rem !important;
          }
        }

        @media (max-width: 576px) {
          .carousel-control-prev {
            left: -5px !important;
          }

          .carousel-control-next {
            right: -5px !important;
          }

          .testimonial-item .bg-white p {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}
