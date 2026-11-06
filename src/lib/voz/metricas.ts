import type { MetricasVoz } from "@/lib/types";

/**
 * Medición del ritmo del habla (pausas y velocidad) a partir de la energía del
 * micrófono. Funciones puras, sin acceso al navegador: así se prueban con
 * datos sintéticos y el servidor puede validar lo que le llega.
 *
 * Esto NO es un diagnóstico ni un test clínico: son medidas descriptivas que
 * se comparan con el propio patrón de la persona (ver senales.ts).
 */

export const PAUSA_MIN_MS = 250;
export const PAUSA_LARGA_MS = 1000;
const DURACION_MIN_MS = 1500;
const RUIDO_PERCENTIL = 0.2;
const PICO_PERCENTIL = 0.95;
const FRACCION_UMBRAL = 0.3;
const VOZ_MIN_MS = 80; // un "golpe" de ruido más corto que esto no es voz

function percentil(ordenado: number[], p: number): number {
  const i = Math.min(ordenado.length - 1, Math.max(0, Math.floor(p * (ordenado.length - 1))));
  return ordenado[i];
}

export function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Recibe la energía (RMS) del micrófono muestreada cada `frameMs` y devuelve
 * cuánto duró el habla y cómo se repartieron las pausas. null si no se
 * distingue voz clara (silencio, ruido parejo o un audio demasiado corto).
 */
export function segmentarEnergia(
  rms: number[],
  frameMs: number
): Omit<MetricasVoz, "palabras"> | null {
  if (rms.length < 20 || !(frameMs > 0)) return null;

  const orden = [...rms].sort((a, b) => a - b);
  const ruido = percentil(orden, RUIDO_PERCENTIL);
  const pico = percentil(orden, PICO_PERCENTIL);
  if (pico < 0.01 || pico < ruido * 2.5) return null;
  const umbral = ruido + FRACCION_UMBRAL * (pico - ruido);

  const conVoz = rms.map((v) => v > umbral);

  // Descarta ráfagas de ruido más cortas que VOZ_MIN_MS.
  const minFrames = Math.max(1, Math.round(VOZ_MIN_MS / frameMs));
  for (let i = 0; i < conVoz.length; ) {
    if (!conVoz[i]) { i++; continue; }
    let j = i;
    while (j < conVoz.length && conVoz[j]) j++;
    if (j - i < minFrames) for (let k = i; k < j; k++) conVoz[k] = false;
    i = j;
  }

  const primero = conVoz.indexOf(true);
  const ultimo = conVoz.lastIndexOf(true);
  if (primero < 0) return null;

  const duracionMs = (ultimo - primero + 1) * frameMs;
  if (duracionMs < DURACION_MIN_MS) return null;

  let vozFrames = 0;
  let pausas = 0;
  let pausasLargas = 0;
  let pausaTotalMs = 0;
  for (let i = primero; i <= ultimo; ) {
    if (conVoz[i]) { vozFrames++; i++; continue; }
    let j = i;
    while (j <= ultimo && !conVoz[j]) j++;
    const ms = (j - i) * frameMs;
    if (ms >= PAUSA_MIN_MS) {
      pausas++;
      pausaTotalMs += ms;
      if (ms >= PAUSA_LARGA_MS) pausasLargas++;
    }
    i = j;
  }

  return {
    duracionMs: Math.round(duracionMs),
    vozMs: Math.round(vozFrames * frameMs),
    pausas,
    pausasLargas,
    pausaTotalMs: Math.round(pausaTotalMs),
  };
}

/** Palabras por minuto de un mensaje, o null si es demasiado corto/raro para compararlo. */
export function ritmoPalabrasMin(v: MetricasVoz): number | null {
  if (v.duracionMs < 3000 || v.palabras < 6) return null;
  const ritmo = v.palabras / (v.duracionMs / 60000);
  return ritmo >= 40 && ritmo <= 300 ? ritmo : null;
}

const num = (x: unknown, max: number): number | null =>
  typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max ? Math.round(x) : null;

/** Valida lo que manda el navegador antes de guardarlo: nunca se confía en el cliente. */
export function sanitizarMetricasVoz(raw: unknown): MetricasVoz | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const duracionMs = num(r.duracionMs, 10 * 60 * 1000);
  const vozMs = num(r.vozMs, 10 * 60 * 1000);
  const pausas = num(r.pausas, 1000);
  const pausasLargas = num(r.pausasLargas, 1000);
  const pausaTotalMs = num(r.pausaTotalMs, 10 * 60 * 1000);
  const palabras = num(r.palabras, 5000);
  if ([duracionMs, vozMs, pausas, pausasLargas, pausaTotalMs, palabras].some((x) => x === null)) return undefined;
  if (vozMs! > duracionMs! || pausaTotalMs! > duracionMs! || pausasLargas! > pausas!) return undefined;
  return {
    duracionMs: duracionMs!, vozMs: vozMs!, pausas: pausas!,
    pausasLargas: pausasLargas!, pausaTotalMs: pausaTotalMs!, palabras: palabras!,
  };
}
