/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignorer les erreurs ESLint pendant le build (optionnel)
  eslint: {
    ignoreDuringBuilds: false, // Met à true pour ignorer, false pour bloquer
  },
  // Ignorer les erreurs TypeScript pendant le build
  typescript: {
    // !! ATTENTION !!
    // Cela permet aux builds de production de se terminer même avec des erreurs TypeScript
    // À utiliser avec précaution
    ignoreBuildErrors: false, // Met à false pour bloquer le build en cas d'erreur
  },
  // Options de compilation
  compiler: {
    // Supprime console.log en production
    removeConsole: process.env.NODE_ENV === "production",
  },
};

module.exports = nextConfig;
