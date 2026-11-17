// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./globals.css";

export default function Home() {
  const router = useRouter();
  const [showSpinner, setShowSpinner] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpinner(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (!showSpinner) return null;

  return (
    <div className="initial-loader">
      <div className="loader-wrapper">
        <div className="loader-ring"></div>
        <div className="loader-ring"></div>
        <div className="loader-ring"></div>
        <p className="loader-text mt-4">Loading PleasantStay Admin...</p>
      </div>

      <style jsx>{`
        .initial-loader {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .loader-wrapper {
          text-align: center;
        }
        .loader-ring {
          position: absolute;
          width: 80px;
          height: 80px;
          border: 3px solid transparent;
          border-radius: 50%;
          animation: spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        }
        .loader-ring:nth-child(1) {
          border-top-color: #22c55e;
          animation-delay: 0s;
        }
        .loader-ring:nth-child(2) {
          border-right-color: #86efac;
          animation-delay: 0.2s;
        }
        .loader-ring:nth-child(3) {
          border-bottom-color: #16a34a;
          animation-delay: 0.4s;
        }
        .loader-text {
          margin-top: 100px;
          color: #22c55e;
          font-weight: 500;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
