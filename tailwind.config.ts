import type { Config } from "tailwindcss";

/**
 * Tema CLARO únicamente. Los colores se exponen como design tokens (CSS vars
 * definidas en app/globals.css, portadas 1:1 del mockup) — los componentes
 * SIEMPRE usan estos tokens, nunca hex hardcodeados (CLAUDE.md §1).
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
        muted: "var(--muted)",
        muted2: "var(--muted2)",
        line: "var(--line)",
        violet: "var(--violet)",
        "violet-s": "var(--violet-s)",
        pink: "var(--pink)",
        mint: "var(--mint)",
        "mint-s": "var(--mint-s)",
        amber: "var(--amber)",
        "amber-s": "var(--amber-s)",
        blue: "var(--blue)",
        "blue-s": "var(--blue-s)",
      },
      fontFamily: {
        // Inter = UI; Space Grotesk = display/headings; JetBrains Mono = cifras.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
