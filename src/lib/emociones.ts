/**
 * Vocabulario cerrado de emociones que puede detectar Griyo al guardar una
 * memoria (ver GRIYO_TOOLS en src/lib/tools/definitions.ts, donde el schema
 * de la tool restringe emocion_detectada a este mismo set). Un vocabulario
 * cerrado es lo que permite agregar/graficar el ánimo en el tiempo — texto
 * libre ("un poco triste", "medio nostálgico") no se puede agrupar.
 */
export const EMOCIONES = [
  "alegria",
  "amor",
  "gratitud",
  "orgullo",
  "nostalgia",
  "neutral",
  "preocupacion",
  "tristeza",
  "soledad",
] as const;

export type Emocion = (typeof EMOCIONES)[number];

// Valencia 1 (más bajo) a 5 (más alto) — la escala que arma el gráfico de
// evolución del ánimo. Valores fuera del vocabulario (datos viejos con
// texto libre) caen en 3 (neutral) por defecto, no se descartan.
const VALENCIA: Record<Emocion, number> = {
  tristeza: 1,
  soledad: 1,
  preocupacion: 2,
  nostalgia: 3,
  neutral: 3,
  orgullo: 4,
  gratitud: 4,
  amor: 5,
  alegria: 5,
};

export function valenciaDe(emocion: string): number {
  return VALENCIA[emocion as Emocion] ?? 3;
}

// Etiquetas legibles (con tildes) para mostrarle a la familia — el valor
// que guarda la tool es el token sin acentos (más robusto para el modelo).
const ETIQUETAS: Record<Emocion, string> = {
  alegria: "Alegría",
  amor: "Amor",
  gratitud: "Gratitud",
  orgullo: "Orgullo",
  nostalgia: "Nostalgia",
  neutral: "Neutral",
  preocupacion: "Preocupación",
  tristeza: "Tristeza",
  soledad: "Soledad",
};

export function etiquetaDe(emocion: string): string {
  return ETIQUETAS[emocion as Emocion] ?? emocion;
}

export type BalanceAnimo = "bajo" | "neutral" | "alto";

export function balanceDeValencia(v: number): BalanceAnimo {
  if (v <= 2) return "bajo";
  if (v >= 4) return "alto";
  return "neutral";
}

export function balanceDe(emocion: string): BalanceAnimo {
  return balanceDeValencia(valenciaDe(emocion));
}

/**
 * Escala de 5 niveles para el auto-registro directo ("¿cómo te sientes
 * hoy?", ver RegistroAnimoAbuelo.tsx) — a diferencia del vocabulario de
 * arriba (lo que Griyo infiere de una charla), esto es lo que la persona
 * elige ella misma. Colores en degradé propio de Griyo (clay → sand →
 * gold), no un semáforo rojo-verde genérico.
 */
export const NIVELES_ANIMO = [
  { valencia: 1, etiqueta: "Terrible", texto: "text-clay-600", fondo: "bg-clay-500" },
  { valencia: 2, etiqueta: "Mal", texto: "text-clay-500", fondo: "bg-clay-400" },
  { valencia: 3, etiqueta: "Regular", texto: "text-sand-700", fondo: "bg-sand-500" },
  { valencia: 4, etiqueta: "Bien", texto: "text-gold-600", fondo: "bg-gold-400" },
  { valencia: 5, etiqueta: "Excelente", texto: "text-gold-600", fondo: "bg-gold-600" },
] as const;
