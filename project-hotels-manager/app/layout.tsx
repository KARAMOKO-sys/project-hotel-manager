// src/app/layout.tsx
import type { Metadata } from "next";

import "bootstrap/dist/css/bootstrap.min.css";
import "primeicons/primeicons.css";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "./globals.css";
import { Providers } from "./providers";
import BootstrapClient from "./shared/components/BootstrapClient";

export const metadata: Metadata = {
  title: "PleasantStay",
  description: "Découvrez et gérez votre prochain séjour avec PleasantStay.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
        <BootstrapClient />
      </body>
    </html>
  );
}
