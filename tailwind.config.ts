import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary: Gold - Luxury and prestige
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f"
        },
        // Secondary: Deep Black - Elegance
        ebony: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#0f172a"
        },
        // Accent: Cream/Off-white
        cream: {
          50: "#fffef9",
          100: "#fffdf2",
          200: "#fffaeb",
          300: "#fff8e1",
          400: "#fff6d3",
          500: "#fef3c7",
          600: "#fde68a",
          700: "#fcd34d",
          800: "#fbbf24",
          900: "#f59e0b"
        },
        // Pure White
        white: "#ffffff",
        // Pure Black
        black: "#000000"
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.05)",
        "card-hover": "0 2px 4px rgba(0, 0, 0, 0.08)",
        glow: "0 0 0 1px rgba(0, 0, 0, 0.06)",
        luxury: "0 4px 12px rgba(0, 0, 0, 0.08)"
      },
      backgroundImage: {
        "gradient-gold": "linear-gradient(135deg, #ffffff 0%, #fffef9 100%)",
        "gradient-dark": "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
        "gradient-gold-dark": "linear-gradient(135deg, #ffffff 0%, #fffef9 100%)"
      }
    }
  },
  plugins: []
};

export default config;
