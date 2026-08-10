/**
 * Vocabulario cerrado de emociones que puede detectar Grillo al guardar una
 * memoria (ver GRILLO_TOOLS en src/lib/tools/definitions.ts, donde el schema
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

export type BalanceAnimo = "bajo" | "neutral" | "alto";

export function balanceDe(emocion: string): BalanceAnimo {
  const v = valenciaDe(emocion);
  if (v <= 2) return "bajo";
  if (v >= 4) return "alto";
  return "neutral";
}
