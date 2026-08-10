import type { Config } from "tailwindcss";

/**
 * Sistema de diseño "Grillo al atardecer" — cálido, redondeado, hogareño.
 * Paleta con roles fijos (ver PROGRESO.md para el resumen completo):
 *   sand   -> fondo/superficies/texto (escala neutra cálida)
 *   ember  -> acento primario (luz de lámpara/marigold) — CTAs, mic
 *   dusk   -> acento secundario (ciruela polvo) — identidad "familia", cielo de atardecer
 *   gold   -> momento especial (memoria guardada)
 *   clay   -> estados de alerta/emergencia (rojo cálido, no rojo de sistema frío)
 */
const config: Config = {
  // Todo src/, no solo app/ y components/ — clases de color que viven en
  // src/lib (p. ej. NIVELES_ANIMO en emociones.ts) se estaban purgando en
  // silencio por no estar en el glob, así que sus círculos salían
  // transparentes en vez del color esperado.
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FFFDFB",
          100: "#FFF8EF",
          200: "#FBF1E6",
          300: "#F3E4D2",
          400: "#EBD9C6",
          500: "#D9C4AC",
          600: "#B5A08A",
          700: "#8C7867",
          800: "#6E5B54",
          900: "#3A2A2E",
        },
        ember: {
          50: "#FFF3E6",
          100: "#FDE6C9",
          200: "#FBD39D",
          300: "#F5B76C",
          400: "#EC9C4C",
          500: "#E2883A",
          600: "#C96B22",
          700: "#A8571B",
          800: "#834414",
          900: "#63330F",
        },
        dusk: {
          50: "#F4F1F8",
          100: "#E7E0EF",
          200: "#CFC1DF",
          300: "#B29FC9",
          400: "#9482B8",
          500: "#7C6A9C",
          600: "#5E4E7B",
          700: "#4A3B5C",
          800: "#362B44",
          900: "#241D2E",
        },
        gold: {
          400: "#F0C563",
          500: "#E8B23D",
          600: "#CC9526",
        },
        clay: {
          400: "#DA6A61",
          500: "#C1483F",
          600: "#A83A32",
        },
        dawn: "#F6B67A",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      fontSize: {
        base: ["1.125rem", "1.6"],
        lg: ["1.25rem", "1.6"],
        xl: ["1.4rem", "1.5"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        warm: "0 10px 30px -8px rgba(99, 51, 15, 0.18)",
        "warm-sm": "0 4px 14px -4px rgba(99, 51, 15, 0.14)",
        "warm-lg": "0 20px 45px -12px rgba(74, 59, 92, 0.28)",
      },
      backgroundImage: {
        dusk: "linear-gradient(160deg, #F6B67A 0%, #D98A6B 28%, #8C6B95 62%, #4A3B5C 100%)",
        "dusk-soft": "linear-gradient(180deg, #FBF1E6 0%, #F3DFCE 100%)",
      },
      keyframes: {
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "60%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "chirp-idle": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.45" },
          "50%": { transform: "scale(1.06)", opacity: "0.7" },
        },
        "chirp-active": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.5" },
          "8%": { transform: "scale(1.22)", opacity: "0.95" },
          "16%": { transform: "scale(1)", opacity: "0.5" },
          "24%": { transform: "scale(1.22)", opacity: "0.95" },
          "32%": { transform: "scale(1)", opacity: "0.5" },
        },
        "think-dot": {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "40%": { transform: "translateY(-6px)", opacity: "1" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 0.6s ease-out both",
        "pop-in": "pop-in 0.35s cubic-bezier(0.34,1.4,0.64,1) both",
        "chirp-idle": "chirp-idle 3.2s ease-in-out infinite",
        "chirp-active": "chirp-active 2.4s ease-in-out infinite",
        "think-dot": "think-dot 1.1s ease-in-out infinite",
        wave: "wave 1s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
