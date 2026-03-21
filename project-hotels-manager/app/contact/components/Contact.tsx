"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ContactInfo {
  id: number;
  icon: string;
  text: string;
  delay: string;
}

export default function Contact() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(
    null,
  );
  const contactRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fonction utilitaire pour définir les refs
  const setRef = (index: number) => (el: HTMLDivElement | null) => {
    contactRefs.current[index] = el;
  };

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

    contactRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Simulation d'envoi (remplacez par votre logique API)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Form submitted:", formData);
      setSubmitStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSubmitStatus(null), 5000);
    } catch (error) {
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo: ContactInfo[] = [
    {
      id: 1,
      icon: "pi pi-map-marker",
      text: "123 Street, New York, USA",
      delay: "0.1s",
    },
    {
      id: 2,
      icon: "pi pi-envelope",
      text: "info@example.com",
      delay: "0.3s",
    },
    {
      id: 3,
      icon: "pi pi-phone",
      text: "+012 345 6789",
      delay: "0.5s",
    },
  ];

  return (
    <div className="contact-section">
      <div className="container">
        {/* Section Header */}
        <div
          className="text-center mx-auto mb-5 wow fadeInUp"
          style={{ maxWidth: "600px" }}
          ref={setRef(0)}
        >
          <span className="section-badge">Get In Touch</span>
          <h1 className="section-title">Contact Us</h1>
          <p className="section-description">
            Eirmod sed ipsum dolor sit rebum labore magna erat. Tempor ut dolore
            lorem kasd vero ipsum sit eirmod sit. Ipsum diam justo sed rebum
            vero dolor duo.
          </p>
        </div>

        <div className="row g-4">
          {/* Contact Info Cards */}
          <div className="col-12">
            <div className="row gy-4">
              {contactInfo.map((info, index) => (
                <div
                  key={info.id}
                  className="col-md-6 col-lg-4 wow fadeIn"
                  data-wow-delay={info.delay}
                  ref={setRef(index + 1)}
                >
                  <div className="contact-card">
                    <div className="contact-card-inner">
                      <div className="contact-icon">
                        <i className={info.icon}></i>
                      </div>
                      <span className="contact-text">{info.text}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map and Form */}
          <div className="col-md-6 wow fadeInUp" data-wow-delay="0.1s">
            <div className="map-container">
              <iframe
                className="position-relative rounded w-100 h-100"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3001156.4288297426!2d-78.01371936852176!3d42.72876761954724!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4ccc4bf0f123a5a9%3A0xddcfc6c1de189567!2sNew%20York%2C%20USA!5e0!3m2!1sen!2sbd!4v1603794290143!5m2!1sen!2sbd"
                frameBorder="0"
                style={{ minHeight: "400px", border: 0 }}
                allowFullScreen
                aria-hidden="false"
                tabIndex={0}
                title="Google Maps"
              ></iframe>
            </div>
          </div>

          {/* Contact Form */}
          <div className="col-md-6">
            <div
              className="contact-form-wrapper wow fadeInUp"
              data-wow-delay="0.5s"
            >
              <p className="form-note mb-4">
                The contact form is currently inactive. Get a functional and
                working contact form with Ajax & PHP in a few minutes. Just copy
                and paste the files, add a little code and you're done.{" "}
                <a
                  href="https://htmlcodex.com/contact-form"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-success"
                >
                  Download Now
                </a>
                .
              </p>

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="form-floating">
                      <input
                        type="text"
                        className="form-control"
                        id="name"
                        placeholder="Your Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="name">Your Name</label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-floating">
                      <input
                        type="email"
                        className="form-control"
                        id="email"
                        placeholder="Your Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="email">Your Email</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-floating">
                      <input
                        type="text"
                        className="form-control"
                        id="subject"
                        placeholder="Subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="subject">Subject</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-floating">
                      <textarea
                        className="form-control"
                        placeholder="Leave a message here"
                        id="message"
                        style={{ height: "150px" }}
                        value={formData.message}
                        onChange={handleChange}
                        required
                      ></textarea>
                      <label htmlFor="message">Message</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <button
                      className="btn-submit w-100"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <i className="pi pi-arrow-right ms-2"></i>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Message de statut */}
              {submitStatus === "success" && (
                <div className="alert alert-success mt-3">
                  Message sent successfully! We'll get back to you soon.
                </div>
              )}
              {submitStatus === "error" && (
                <div className="alert alert-danger mt-3">
                  Something went wrong. Please try again later.
                </div>
              )}
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

        .contact-section {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          padding: 80px 0;
          position: relative;
          overflow: hidden;
        }

        .contact-section::before {
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

        .contact-section::after {
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

        .contact-section .container {
          position: relative;
          z-index: 1;
        }

        /* Section Header */
        .section-badge {
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

        .section-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .section-description {
          color: #6c757d;
          line-height: 1.6;
        }

        /* Contact Cards */
        .contact-card {
          background: #f8f9fa;
          border-radius: 20px;
          padding: 0.75rem;
          transition: all 0.3s ease;
        }

        .contact-card:hover {
          transform: translateY(-5px);
        }

        .contact-card-inner {
          display: flex;
          align-items: center;
          background: white;
          padding: 1rem;
          border-radius: 15px;
          border: 1px dashed rgba(34, 197, 94, 0.3);
          transition: all 0.3s ease;
        }

        .contact-card:hover .contact-card-inner {
          border-color: var(--primary-color);
          box-shadow: 0 5px 20px rgba(34, 197, 94, 0.1);
        }

        .contact-icon {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(34, 197, 94, 0.1);
          border-radius: 12px;
          margin-right: 1rem;
          transition: all 0.3s ease;
        }

        .contact-card:hover .contact-icon {
          background: var(--primary-color);
        }

        .contact-icon i {
          font-size: 1.5rem;
          color: var(--primary-color);
          transition: all 0.3s ease;
        }

        .contact-card:hover .contact-icon i {
          color: white;
        }

        .contact-text {
          color: #4b5563;
          font-size: 1rem;
        }

        /* Map */
        .map-container {
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          height: 100%;
          min-height: 400px;
        }

        .map-container iframe {
          width: 100%;
          height: 100%;
        }

        /* Form */
        .contact-form-wrapper {
          background: white;
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }

        .form-note {
          color: #6c757d;
          font-size: 0.875rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 12px;
          border-left: 3px solid var(--primary-color);
        }

        .form-note a {
          color: var(--primary-color);
          text-decoration: none;
          font-weight: 500;
        }

        .form-note a:hover {
          text-decoration: underline;
        }

        .form-floating {
          margin-bottom: 0;
        }

        .form-control {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          transition: all 0.3s ease;
        }

        .form-control:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
        }

        .form-floating label {
          color: #6c757d;
        }

        .btn-submit {
          background: linear-gradient(
            135deg,
            var(--primary-color) 0%,
            var(--primary-dark) 100%
          );
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(34, 197, 94, 0.3);
        }

        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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
          animation: fadeInUp 0.6s ease forwards;
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
          .section-title {
            font-size: 3rem;
          }
        }

        @media (max-width: 768px) {
          .contact-section {
            padding: 60px 0;
          }

          .section-title {
            font-size: 2rem;
          }

          .contact-card-inner {
            justify-content: center;
          }

          .contact-icon {
            margin-right: 0.5rem;
          }

          .contact-text {
            font-size: 0.875rem;
          }

          .contact-form-wrapper {
            padding: 1.5rem;
          }

          .map-container {
            min-height: 300px;
            margin-bottom: 2rem;
          }
        }

        @media (max-width: 576px) {
          .section-title {
            font-size: 1.75rem;
          }

          .contact-icon {
            width: 40px;
            height: 40px;
          }

          .contact-icon i {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}
