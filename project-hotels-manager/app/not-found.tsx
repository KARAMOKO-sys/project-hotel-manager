// app/not-found.jsx
"use client";

import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="container-xxl py-5">
        <div className="container text-center">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <i className="pi pi-exclamation-triangle display-1 text-success"></i>
              <h1 className="display-1 fw-bold text-success">404</h1>
              <h1 className="mb-4 fw-bold">Page Not Found</h1>
              <p className="mb-4 text-muted">
                We're sorry, the page you have looked for does not exist in our
                website! Maybe go to our home page or try to use a search?
              </p>
              <Link href="/" className="btn btn-success py-3 px-5 rounded-pill">
                Go Back To Home
                <i className="pi pi-arrow-right ms-2"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .not-found-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        }
        .btn-success {
          background-color: #22c55e;
          border: none;
          transition: all 0.3s ease;
        }
        .btn-success:hover {
          background-color: #16a34a;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(34, 197, 94, 0.3);
        }
        .display-1 {
          font-size: 6rem;
          font-weight: 800;
        }
        @media (max-width: 768px) {
          .display-1 {
            font-size: 4rem;
          }
        }
      `}</style>
    </div>
  );
}
