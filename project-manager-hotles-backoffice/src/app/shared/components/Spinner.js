// src/components/ui/spinner/GlobalSpinner.tsx
"use client";

import React from "react";
import { useSpinner } from "../contexts/SpinnerContext";

const GlobalSpinner = () => {
  const { loading, spinnerText } = useSpinner();

  if (!loading) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        zIndex: 9999,
      }}
    >
      <div className="text-center">
        {/* Spinner Bootstrap avec couleur verte */}
        <div
          className="spinner-border"
          role="status"
          style={{
            width: "4rem",
            height: "4rem",
            color: "#22c55e", // Vert standard
          }}
        >
          <span className="visually-hidden">Chargement...</span>
        </div>

        {spinnerText && (
          <p className="mt-3 mb-0 text-success fw-medium">{spinnerText}</p>
        )}
      </div>
    </div>
  );
};

export default GlobalSpinner;
