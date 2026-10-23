import {
  getConversacionesPorIds,
  listAlertasAnimo,
  listAlertasEmergencia,
  listConversacionesFechas,
  listMemorias,
  listRegistrosAnimo,
} from "@/lib/db";
import { valenciaDe } from "@/lib/emociones";
import { calcularSenales, diaChile, type Senales, type SesionCharla } from "@/lib/senales";

/**
 * Seguimiento de una persona mayor para su familia: cuánto conversó, cómo
 * estuvo su ánimo, qué temas aparecieron y las señales de aislamiento y de
 * cambio en la memoria. Alimenta la vista de actividad y el informe en PDF.
 * Solo trabaja con conteos, fechas y los resúmenes que ya ve la familia:
 * nunca devuelve el texto de las charlas.
 */

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_HISTORIA_SENALES = 46; // 14 recientes + 32 de línea base
const HUECO_SESION_MS = 30 * 60 * 1000;

export interface PuntoDia {
  fecha: string; // YYYY-MM-DD (Chile)
  mensajes: number;
  animo: number | null; // valencia promedio 1 a 5
  historias: number;
  registros: number;
}

export interface EventoAlerta {
  fecha: string;
  tipo: "animo" | "emergencia";
  texto: string;
}

export type TendenciaAnimo = "sube" | "baja" | "estable";

export interface Seguimiento {
  generadoEn: string;
  nombre: string;
  dias: number;
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  resumen: {
    diasConConversacion: number;
    mensajes: number;
    ultimaConversacion: string | null;
    historiasNuevas: number;
    registrosAnimo: number;
    animoPromedio: number | null;
    tendenciaAnimo: TendenciaAnimo | null;
  };
  serie: PuntoDia[];
  temas: { tema: string; veces: number }[];
  alertas: EventoAlerta[];
  senales: Senales;
}

function promedio(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Agrupa los turnos en sesiones (hueco de más de 30 min = sesión nueva) y devuelve el último turno de cada una. */
export function ultimosTurnosPorSesion(filas: { id: string; fecha: string }[]): { id: string; fecha: string }[] {
  const orden = [...filas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const ultimos: { id: string; fecha: string }[] = [];
  for (let i = 0; i < orden.length; i++) {
    const siguiente = orden[i + 1];
    const termina =
      !siguiente || new Date(siguiente.fecha).getTime() - new Date(orden[i].fecha).getTime() > HUECO_SESION_MS;
    if (termina) ultimos.push(orden[i]);
  }
  return ultimos;
}

async function cargarSesiones(filas: { id: string; fecha: string }[]): Promise<SesionCharla[]> {
  const ultimos = ultimosTurnosPorSesion(filas);
  const sesiones: SesionCharla[] = [];
  for (let i = 0; i < ultimos.length; i += 100) {
    const lote = ultimos.slice(i, i + 100);
    const conversaciones = await getConversacionesPorIds(lote.map((x) => x.id));
    for (const c of conversaciones) {
      sesiones.push({
        fecha: c.fecha,
        mensajesUsuario: (c.transcripcion_completa ?? [])
          .filter((m) => m.role === "user")
          .map((m) => m.content),
      });
    }
  }
  return sesiones;
}

export async function construirSeguimiento(
  abueloId: string,
  nombre: string,
  dias = 30
): Promise<Seguimiento> {
  const ahora = Date.now();
  const ventana = Math.max(7, Math.min(90, Math.round(dias)));
  const desdeIso = new Date(ahora - Math.max(ventana, DIAS_HISTORIA_SENALES) * DIA_MS).toISOString();
  const inicioVentana = ahora - ventana * DIA_MS;

  const [filas, memorias, registros, alertasAnimo, emergencias] = await Promise.all([
    listConversacionesFechas(abueloId, desdeIso),
    listMemorias(abueloId),
    listRegistrosAnimo(abueloId),
    listAlertasAnimo(abueloId),
    listAlertasEmergencia(abueloId),
  ]);

  const sesiones = await cargarSesiones(filas);

  const diasSerie: string[] = [];
  for (let i = ventana - 1; i >= 0; i--) diasSerie.push(diaChile(ahora - i * DIA_MS));
  const indice = new Map(diasSerie.map((d, i) => [d, i]));

  const serie: PuntoDia[] = diasSerie.map((fecha) => ({ fecha, mensajes: 0, animo: null, historias: 0, registros: 0 }));
  const valenciasPorDia = new Map<string, number[]>();

  for (const f of filas) {
    const i = indice.get(diaChile(f.fecha));
    if (i !== undefined) serie[i].mensajes += 1;
  }
  const memoriasVentana = memorias.filter((m) => new Date(m.fecha).getTime() >= inicioVentana);
  for (const m of memoriasVentana) {
    const dia = diaChile(m.fecha);
    const i = indice.get(dia);
    if (i === undefined) continue;
    serie[i].historias += 1;
    valenciasPorDia.set(dia, [...(valenciasPorDia.get(dia) ?? []), valenciaDe(m.emocion_detectada)]);
  }
  const registrosVentana = registros.filter((r) => new Date(r.fecha).getTime() >= inicioVentana);
  for (const r of registrosVentana) {
    const dia = diaChile(r.fecha);
    const i = indice.get(dia);
    if (i === undefined) continue;
    serie[i].registros += 1;
    valenciasPorDia.set(dia, [...(valenciasPorDia.get(dia) ?? []), r.valencia]);
  }
  for (const [dia, valencias] of valenciasPorDia) {
    const i = indice.get(dia);
    if (i !== undefined) serie[i].animo = promedio(valencias);
  }

  // Tendencia: promedio de la primera mitad de la ventana contra la segunda.
  const mitad = Math.floor(serie.length / 2);
  const primeraMitad = serie.slice(0, mitad).flatMap((p) => valenciasPorDia.get(p.fecha) ?? []);
  const segundaMitad = serie.slice(mitad).flatMap((p) => valenciasPorDia.get(p.fecha) ?? []);
  let tendencia: TendenciaAnimo | null = null;
  if (primeraMitad.length >= 3 && segundaMitad.length >= 3) {
    const d = (promedio(segundaMitad) as number) - (promedio(primeraMitad) as number);
    tendencia = d >= 0.5 ? "sube" : d <= -0.5 ? "baja" : "estable";
  }

  const todasValencias = serie.flatMap((p) => valenciasPorDia.get(p.fecha) ?? []);

  const conteoTemas = new Map<string, number>();
  for (const m of memoriasVentana) {
    const t = (m.tema ?? "").trim().toLowerCase();
    if (t) conteoTemas.set(t, (conteoTemas.get(t) ?? 0) + 1);
  }
  const temas = [...conteoTemas.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([tema, veces]) => ({ tema, veces }));

  const alertas: EventoAlerta[] = [
    ...alertasAnimo
      .filter((a) => new Date(a.fecha).getTime() >= inicioVentana)
      .map((a) => ({ fecha: a.fecha, tipo: "animo" as const, texto: a.resumen })),
    ...emergencias
      .filter((a) => new Date(a.fecha).getTime() >= inicioVentana)
      .map((a) => ({
        fecha: a.fecha,
        tipo: "emergencia" as const,
        texto: a.estado === "activa" ? "Pidió ayuda y la alerta sigue activa." : "Pidió ayuda; la alerta ya se resolvió.",
      })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const ultima = filas.length ? filas[filas.length - 1].fecha : null;

  const senales = calcularSenales(
    {
      ahora,
      fechasConversacion: filas.map((f) => f.fecha),
      emociones: memorias.map((m) => ({ fecha: m.fecha, emocion: m.emocion_detectada })),
      registrosAnimo: registros.map((r) => ({ fecha: r.fecha, valencia: r.valencia })),
    },
    {
      ahora,
      sesiones,
      memorias: memorias
        .filter((m) => new Date(m.fecha).getTime() >= ahora - DIAS_HISTORIA_SENALES * DIA_MS)
        .map((m) => ({ fecha: m.fecha, resumen: m.resumen })),
    }
  );

  return {
    generadoEn: new Date(ahora).toISOString(),
    nombre,
    dias: ventana,
    desde: diasSerie[0],
    hasta: diasSerie[diasSerie.length - 1],
    resumen: {
      diasConConversacion: serie.filter((p) => p.mensajes > 0).length,
      mensajes: serie.reduce((a, p) => a + p.mensajes, 0),
      ultimaConversacion: ultima,
      historiasNuevas: memoriasVentana.length,
      registrosAnimo: registrosVentana.length,
      animoPromedio: promedio(todasValencias),
      tendenciaAnimo: tendencia,
    },
    serie,
    temas,
    alertas,
    senales,
  };
}
