import type { Config } from "tailwindcss";

/**
 * Tema CLARO únicamente. Los colores se exponen como design tokens (CSS vars
 * definidas en app/globals.css) — los componentes SIEMPRE usan estas clases,
 * nunca hex hardcodeados (regla CLAUDE.md §1; ux-design-consistency lo verifica).
 * La escala tipográfica usa la por defecto de Tailwind (ver typography.md).
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        ink: "var(--ink)",
        violet: "var(--violet)",
        pink: "var(--pink)",
        mint: "var(--mint)",
        amber: "var(--amber)",
      },
      fontFamily: {
        // Inter = UI por defecto; Space Grotesk = display/headings.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
