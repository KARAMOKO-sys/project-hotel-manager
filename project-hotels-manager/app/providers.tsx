// src/app/providers.tsx
"use client";

import React from "react";
import { SpinnerProvider } from "./shared/contexts/SpinnerContext";
import GlobalSpinner from "./shared/components/Spinner";
import { SiteConfigProvider } from "./shared/contexts/SiteConfigContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SiteConfigProvider>
      <SpinnerProvider>
        <GlobalSpinner />
        {children}
      </SpinnerProvider>
    </SiteConfigProvider>
  );
}
