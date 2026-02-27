// src/app/providers.tsx
"use client";

import React from "react";
import { SpinnerProvider } from "./shared/contexts/SpinnerContext";
import GlobalSpinner from "./shared/components/Spinner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SpinnerProvider>
      <GlobalSpinner />
      {children}
    </SpinnerProvider>
  );
}
