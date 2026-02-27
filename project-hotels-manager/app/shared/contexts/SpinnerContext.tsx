// src/contexts/SpinnerContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface SpinnerContextType {
  loading: boolean;
  spinnerText: string;
  showSpinner: (text?: string) => void;
  hideSpinner: () => void;
}

const SpinnerContext = createContext<SpinnerContextType | undefined>(undefined);

export const SpinnerProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [spinnerText, setSpinnerText] = useState("Chargement...");

  const showSpinner = (text = "Chargement...") => {
    setSpinnerText(text);
    setLoading(true);
  };

  const hideSpinner = () => {
    setLoading(false);
  };

  return (
    <SpinnerContext.Provider
      value={{ loading, spinnerText, showSpinner, hideSpinner }}
    >
      {children}
    </SpinnerContext.Provider>
  );
};

export const useSpinner = () => {
  const context = useContext(SpinnerContext);
  if (context === undefined) {
    throw new Error("useSpinner doit être utilisé dans un SpinnerProvider");
  }
  return context;
};
