import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bloque le build de production en cas d'erreur ESLint.
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Bloque le build de production en cas d'erreur TypeScript.
  typescript: {
    ignoreBuildErrors: false,
  },
  compiler: {
    // Supprime les console.log en production.
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
