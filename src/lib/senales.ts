import { valenciaDe } from "@/lib/emociones";

/**
 * Señales de aislamiento y de cambio en la memoria, calculadas con los datos
 * que Griyo ya tiene. NO son un diagnóstico ni una evaluación clínica: se
 * comparan con el propio patrón de la persona y se le cuentan a la familia
 * como lo haría alguien cercano ("noté que..."). Funciones puras, sin
 * acceso a la base, para poder probarlas con datos de ejemplo.
 */

const TZ = "America/Santiago";
const DIA_MS = 24 * 60 * 60 * 1000;

export type NivelAislamiento = "sin_datos" | "tranquilo" | "atencion";
export type NivelMemoria = "sin_datos" | "sin_cambios" | "cambio";

export interface Indicador {
  etiqueta: string;
  valor: string;
}

export interface SenalAislamiento {
  nivel: NivelAislamiento;
  titulo: string;
  mensaje: string;
  indicadores: Indicador[];
}

export interface SenalMemoria {
  nivel: NivelMemoria;
  titulo: string;
  mensaje: string;
  indicadores: Indicador[];
  suficienteHistoria: boolean;
}

export interface Senales {
  aislamiento: SenalAislamiento;
  memoria: SenalMemoria;
  aviso: string;
}

export const AVISO_SENALES =
  "Estas señales comparan a la persona con su propio patrón. Son orientativas y no son un diagnóstico: si algo le preocupa, conversen con un profesional de salud.";

// Historia mínima para poder comparar a alguien consigo mismo.
export const MIN_DIAS_HISTORIA = 20;
const MIN_MENSAJES_RECIENTES = 10;
const MIN_MENSAJES_BASE = 20;

const fechaChile = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" en hora de Chile. */
export function diaChile(d: Date | string | number): string {
  return fechaChile.format(new Date(d));
}

function diasEntre(desdeYmd: string, hastaYmd: string): number {
  return Math.round(
    (new Date(`${hastaYmd}T00:00:00Z`).getTime() - new Date(`${desdeYmd}T00:00:00Z`).getTime()) / DIA_MS
  );
}

/* --------------------------------- aislamiento -------------------------------- */

export interface EntradaAislamiento {
  ahora: number;
  /** Fecha (ISO) de cada turno de charla. */
  fechasConversacion: string[];
  emociones: { fecha: string; emocion: string }[];
  registrosAnimo: { fecha: string; valencia: number }[];
}

export function calcularAislamiento(e: EntradaAislamiento): SenalAislamiento {
  const titulo = "Contacto y aislamiento";
  if (e.fechasConversacion.length === 0) {
    return {
      nivel: "sin_datos",
      titulo,
      mensaje: "Todavía no hay conversaciones con Griyo para evaluar.",
      indicadores: [],
    };
  }

  const hoy = diaChile(e.ahora);
  const dias = e.fechasConversacion.map((f) => diaChile(f));
  const ultimo = dias.reduce((a, b) => (a > b ? a : b));
  const diasSinCharlar = diasEntre(ultimo, hoy);

  const activos14 = new Set(dias.filter((d) => diasEntre(d, hoy) < 14)).size;
  const estaSemana = dias.filter((d) => diasEntre(d, hoy) < 7).length;
  const semanaAnterior = dias.filter((d) => {
    const n = diasEntre(d, hoy);
    return n >= 7 && n < 14;
  }).length;

  const hace14 = e.ahora - 14 * DIA_MS;
  const bajos = e.emociones.filter(
    (x) => new Date(x.fecha).getTime() >= hace14 && valenciaDe(x.emocion) <= 1
  ).length;
  const bajosRegistro = e.registrosAnimo.filter(
    (r) => new Date(r.fecha).getTime() >= hace14 && r.valencia <= 2
  ).length;
  const menciones = bajos + bajosRegistro;

  const motivos: string[] = [];
  if (diasSinCharlar >= 5) motivos.push(`lleva ${diasSinCharlar} días sin conversar con Griyo`);
  else if (activos14 <= 2) motivos.push(`solo conversó ${activos14} de los últimos 14 días`);
  if (menciones >= 3) motivos.push(`mencionó o marcó tristeza o soledad ${menciones} veces en 2 semanas`);
  if (semanaAnterior >= 6 && estaSemana < semanaAnterior / 2) {
    motivos.push("conversó menos de la mitad que la semana anterior");
  }

  const indicadores: Indicador[] = [
    { etiqueta: "Días desde la última charla", valor: diasSinCharlar === 0 ? "hoy" : String(diasSinCharlar) },
    { etiqueta: "Días con charla (últimos 14)", valor: `${activos14} de 14` },
    { etiqueta: "Mensajes esta semana / la anterior", valor: `${estaSemana} / ${semanaAnterior}` },
    { etiqueta: "Veces con ánimo muy bajo (2 semanas)", valor: String(menciones) },
  ];

  if (motivos.length === 0) {
    return {
      nivel: "tranquilo",
      titulo,
      mensaje: `Conversa con regularidad: ${activos14} de los últimos 14 días.`,
      indicadores,
    };
  }
  const texto = motivos.join("; ");
  return {
    nivel: "atencion",
    titulo,
    mensaje: `Conviene acompañar más de cerca: ${texto}.`,
    indicadores,
  };
}

/* ----------------------------------- memoria ---------------------------------- */

export interface SesionCharla {
  /** Fecha (ISO) del último turno de la sesión. */
  fecha: string;
  mensajesUsuario: string[];
}

export interface EntradaMemoria {
  ahora: number;
  sesiones: SesionCharla[];
  memorias: { fecha: string; resumen: string }[];
}

const PARECIDO_HISTORIA = 0.6;
const PARECIDO_PREGUNTA = 0.65;

const STOP = new Set(
  "para como pero porque cuando donde desde hasta entre sobre tambien este esta estos estas ese esa esos esas aquel aquella muy mas menos todo toda todos todas algo algun alguna unos unas quien quienes cual cuales ahora luego despues antes siempre nunca ya fue era eran son ser sido estaba estaban tiene tenia tienen habia hay hace hacia hizo dijo dice decia contaba conto cuenta persona".split(
    " "
  )
);

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokens(texto: string): Set<string> {
  return new Set(
    normalizar(texto)
      .replace(/[^a-z0-9ñ\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3 && !STOP.has(t))
  );
}

export function parecido(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let comunes = 0;
  for (const t of a) if (b.has(t)) comunes++;
  return comunes / (a.size + b.size - comunes);
}

const PATRONES_OLVIDO: RegExp[] = [
  /no me acuerdo/,
  /no recuerdo/,
  /no me acuerd/,
  /se me olvid/,
  /me olvide/,
  /como se llamaba/,
  /como era que/,
  /ya te lo (dije|conte|comente)/,
];

export function contarFrasesDeOlvido(mensajes: string[]): number {
  let n = 0;
  for (const m of mensajes) {
    const t = normalizar(m);
    if (PATRONES_OLVIDO.some((p) => p.test(t))) n++;
  }
  return n;
}

/** Pares de mensajes casi iguales dentro de una misma sesión (preguntas o frases repetidas). */
export function contarRepeticionesEnSesion(mensajes: string[]): number {
  const conjuntos = mensajes.map(tokens).filter((s) => s.size >= 4);
  let n = 0;
  for (let i = 0; i < conjuntos.length; i++) {
    for (let j = i + 1; j < conjuntos.length; j++) {
      if (parecido(conjuntos[i], conjuntos[j]) >= PARECIDO_PREGUNTA) {
        n++;
        break; // una repetición por mensaje alcanza
      }
    }
  }
  return n;
}

/** Historias parecidas contadas en días distintos: cuántas de `objetivo` ya aparecían antes. */
export function contarHistoriasRepetidas(
  objetivo: { fecha: string; resumen: string }[],
  todas: { fecha: string; resumen: string }[]
): number {
  let n = 0;
  for (const m of objetivo) {
    const tm = tokens(m.resumen);
    const dia = diaChile(m.fecha);
    const repetida = todas.some(
      (o) =>
        o !== m &&
        diaChile(o.fecha) < dia &&
        parecido(tm, tokens(o.resumen)) >= PARECIDO_HISTORIA
    );
    if (repetida) n++;
  }
  return n;
}

function por100(n: number, total: number): number {
  return total > 0 ? (n / total) * 100 : 0;
}

export function calcularMemoria(e: EntradaMemoria): SenalMemoria {
  const titulo = "Memoria y conversación";
  const hace14 = e.ahora - 14 * DIA_MS;

  const recientes = e.sesiones.filter((s) => new Date(s.fecha).getTime() >= hace14);
  const base = e.sesiones.filter((s) => new Date(s.fecha).getTime() < hace14);
  const msgRec = recientes.flatMap((s) => s.mensajesUsuario);
  const msgBase = base.flatMap((s) => s.mensajesUsuario);

  const primera = e.sesiones.length
    ? Math.min(...e.sesiones.map((s) => new Date(s.fecha).getTime()))
    : e.ahora;
  const diasHistoria = Math.floor((e.ahora - primera) / DIA_MS);
  const suficiente =
    diasHistoria >= MIN_DIAS_HISTORIA &&
    msgRec.length >= MIN_MENSAJES_RECIENTES &&
    msgBase.length >= MIN_MENSAJES_BASE;

  if (!suficiente) {
    return {
      nivel: "sin_datos",
      titulo,
      mensaje:
        "Todavía no hay suficiente historia para compararla con su propio patrón: hacen falta unas 3 semanas de charlas habituales.",
      indicadores: [],
      suficienteHistoria: false,
    };
  }

  const olvidoRec = contarFrasesDeOlvido(msgRec);
  const olvidoBase = contarFrasesDeOlvido(msgBase);
  const tasaOlvidoRec = por100(olvidoRec, msgRec.length);
  const tasaOlvidoBase = por100(olvidoBase, msgBase.length);

  const repRec = recientes.reduce((s, x) => s + contarRepeticionesEnSesion(x.mensajesUsuario), 0);
  const repBase = base.reduce((s, x) => s + contarRepeticionesEnSesion(x.mensajesUsuario), 0);
  const tasaRepRec = por100(repRec, msgRec.length);
  const tasaRepBase = por100(repBase, msgBase.length);

  const memRec = e.memorias.filter((m) => new Date(m.fecha).getTime() >= hace14);
  const memBase = e.memorias.filter((m) => new Date(m.fecha).getTime() < hace14);
  const histRec = contarHistoriasRepetidas(memRec, e.memorias);
  const histBase = contarHistoriasRepetidas(memBase, e.memorias);

  const cambios: string[] = [];
  if (olvidoRec >= 3 && tasaOlvidoRec >= tasaOlvidoBase * 2 && tasaOlvidoRec - tasaOlvidoBase >= 2) {
    cambios.push("dice con más frecuencia que no se acuerda o que se le olvidó algo");
  }
  if (repRec >= 3 && tasaRepRec >= tasaRepBase * 2 && tasaRepRec - tasaRepBase >= 2) {
    cambios.push("repite más preguntas o frases dentro de una misma charla");
  }
  if (histRec >= 2 && histRec >= histBase * 2) {
    cambios.push("cuenta de nuevo historias que ya había contado");
  }

  const f = (x: number) => x.toFixed(1).replace(".", ",");
  const indicadores: Indicador[] = [
    {
      etiqueta: "Frases de olvido (cada 100 mensajes)",
      valor: `${f(tasaOlvidoRec)} ahora, ${f(tasaOlvidoBase)} habitual`,
    },
    {
      etiqueta: "Repeticiones en una charla (cada 100 mensajes)",
      valor: `${f(tasaRepRec)} ahora, ${f(tasaRepBase)} habitual`,
    },
    { etiqueta: "Historias que ya había contado", valor: `${histRec} ahora, ${histBase} antes` },
  ];

  if (cambios.length === 0) {
    return {
      nivel: "sin_cambios",
      titulo,
      mensaje: "En las últimas 2 semanas no se ven cambios respecto de su patrón habitual.",
      indicadores,
      suficienteHistoria: true,
    };
  }
  return {
    nivel: "cambio",
    titulo,
    mensaje: `En las últimas 2 semanas notamos un cambio respecto de su propio patrón: ${cambios.join("; ")}.`,
    indicadores,
    suficienteHistoria: true,
  };
}

export function calcularSenales(
  aislamiento: EntradaAislamiento,
  memoria: EntradaMemoria
): Senales {
  return {
    aislamiento: calcularAislamiento(aislamiento),
    memoria: calcularMemoria(memoria),
    aviso: AVISO_SENALES,
  };
}
