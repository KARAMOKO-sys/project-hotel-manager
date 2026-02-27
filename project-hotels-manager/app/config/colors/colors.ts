// src/config/colors.ts

export const colors = {
  brand: {
    primary: "#F97316", // Orange principal
    primaryHover: "#EA580C",

    secondary: "#6366F1", // Indigo
    secondaryHover: "#4F46E5",

    info: "#0EA5E9",
    success: "#22C55E",
    warning: "#FACC15",
    danger: "#EF4444",
  },

  text: {
    primary: "#1F2937",
    secondary: "#6B7280",
    muted: "#9CA3AF",
    inverse: "#FFFFFF",
  },

  background: {
    page: "#F9FAFB",
    card: "#FFFFFF",
    dark: "#111827",
    overlay: "rgba(0,0,0,0.5)",
  },

  border: {
    light: "#E5E7EB",
    normal: "#D1D5DB",
    dark: "#9CA3AF",
  },
} as const;
