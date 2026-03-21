// src/app/layout.tsx
import type { Metadata } from "next";

import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "./globals.css";
import { SpinnerProvider } from "./shared/contexts/SpinnerContext";
import GlobalSpinner from "./shared/components/Spinner";

export const metadata: Metadata = {
  title: "Makaan - Real Estate",
  description: "Find your perfect home",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SpinnerProvider>
          <GlobalSpinner />
          {children}
        </SpinnerProvider>
      </body>
    </html>
  );
}
