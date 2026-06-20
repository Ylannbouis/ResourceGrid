import type { Config } from "tailwindcss";

/**
 * Centralized palette. Markers, popups and UI chrome all pull from these tokens so
 * the colors stay consistent and easy to tweak. Restrained on purpose:
 * teal brand + three semantic status colors + neutrals. No purple.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0d9488", // teal-600 — primary action/brand
          dark: "#0f766e", // teal-700
          light: "#5eead4", // teal-300
        },
        offer: {
          DEFAULT: "#059669", // emerald-600 — resources available
          soft: "#d1fae5", // emerald-100
        },
        need: {
          DEFAULT: "#e11d48", // rose-600 — help requested
          soft: "#ffe4e6", // rose-100
        },
        claimed: {
          DEFAULT: "#d97706", // amber-600 — in progress
          soft: "#fef3c7", // amber-100
        },
      },
      boxShadow: {
        sheet: "0 -8px 30px -10px rgba(15, 23, 42, 0.25)",
        card: "0 6px 24px -12px rgba(15, 23, 42, 0.35)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
