import { enviarEmailAFamilia } from "@/lib/avisoFamilia";
import {
  guardarPreferenciaCharla,
  listAbuelos,
  listConversacionesFechas,
  listPreferenciasCharla,
  listPreguntasFamilia,
  listPushSubscriptions,
  eliminarPushSubscriptionPorEndpoint,
} from "@/lib/db";
import { enviarNotificacionATodas, isPushConfigured } from "@/lib/push/webPush";
import { diaChile } from "@/lib/senales";
import { HORA_CHARLA_POR_DEFECTO, type Abuelo, type PreferenciaCharla } from "@/lib/types";

/**
 * Aviso diario que invita a la persona mayor a conversar con Griyo.
 * Lo dispara el mismo cron externo que manda los recordatorios
 * (/api/push/enviar-pendientes), así que tolera que el cron corra cada pocos
 * minutos: avisa si la hora elegida ya pasó hace menos de VENTANA_MIN minutos.
 */

export const VENTANA_MIN = 10;
const ZONA = "America/Santiago";
const DIA_MS = 24 * 60 * 60 * 1000;

export function horaYDiaChile(ahora = new Date()): { hora: string; hoy: string } {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ahora);
  return { hora: partes, hoy: diaChile(ahora) };
}

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function dentroDeVentana(horaElegida: string, horaAhora: string, ventanaMin = VENTANA_MIN): boolean {
  const d = minutos(horaAhora) - minutos(horaElegida);
  return d >= 0 && d < ventanaMin;
}

/** ¿Hay que mandar hoy el aviso a esta persona? (sin mirar todavía si conversó hoy) */
export function toca(
  pref: Pick<PreferenciaCharla, "hora" | "activo" | "ultimo_aviso">,
  horaAhora: string,
  hoy: string
): boolean {
  if (!pref.activo) return false;
  if (!dentroDeVentana(pref.hora, horaAhora)) return false;
  if (pref.ultimo_aviso && diaChile(pref.ultimo_aviso) === hoy) return false;
  return true;
}

const FRASES = [
  (n: string) => `${n}, ¿conversamos un ratito?`,
  (n: string) => `${n}, ¿cómo amaneciste hoy? Cuéntame.`,
  (n: string) => `Hola ${n}, tengo ganas de escucharte. ¿Conversamos?`,
  (n: string) => `${n}, ¿qué tal si me cuentas algo de tu día?`,
  (n: string) => `¿Te acuerdas de algo lindo de cuando eras joven? Cuéntamelo, ${n}.`,
  (n: string) => `Aquí estoy, ${n}. Cuando quieras, conversamos.`,
];

export function armarMensaje(
  nombre: string,
  hoy: string,
  preguntaDeFamilia?: { autor_nombre: string } | null
): { titulo: string; cuerpo: string } {
  const primerNombre = nombre.trim().split(/\s+/)[0] || nombre;
  if (preguntaDeFamilia) {
    return {
      titulo: "Griyo",
      cuerpo: `${primerNombre}, ${preguntaDeFamilia.autor_nombre} te dejó una pregunta. ¿La conversamos?`,
    };
  }
  const dia = Math.floor(new Date(`${hoy}T00:00:00Z`).getTime() / DIA_MS);
  return { titulo: "Griyo", cuerpo: FRASES[dia % FRASES.length](primerNombre) };
}

export interface ResultadoAvisos {
  revisados: number;
  enviados: number;
  yaConversaron: number;
  sinNotificaciones: number;
  familia: { revisadas: number; avisadas: number };
}

export async function ejecutarAvisosDiarios(ahora = new Date()): Promise<ResultadoAvisos> {
  const resultado: ResultadoAvisos = {
    revisados: 0,
    enviados: 0,
    yaConversaron: 0,
    sinNotificaciones: 0,
    familia: { revisadas: 0, avisadas: 0 },
  };
  const { hora, hoy } = horaYDiaChile(ahora);

  const [abuelos, preferencias] = await Promise.all([listAbuelos(), listPreferenciasCharla()]);
  const prefPor = new Map(preferencias.map((p) => [p.abuelo_id, p]));

  if (isPushConfigured()) {
    for (const abuelo of abuelos) {
      const guardada = prefPor.get(abuelo.id);
      const pref = guardada ?? {
        hora: HORA_CHARLA_POR_DEFECTO,
        activo: true,
        ultimo_aviso: null,
      };
      if (!toca(pref, hora, hoy)) continue;
      resultado.revisados++;

      const subs = await listPushSubscriptions(abuelo.id);
      if (subs.length === 0) {
        resultado.sinNotificaciones++;
        continue;
      }

      const fechas = await listConversacionesFechas(abuelo.id, new Date(ahora.getTime() - DIA_MS).toISOString());
      if (fechas.some((f) => diaChile(f.fecha) === hoy)) {
        resultado.yaConversaron++;
        await guardarPreferenciaCharla(abuelo.id, { ultimo_aviso: ahora.toISOString() }).catch(() => {});
        continue;
      }

      // Se reserva el aviso ANTES de mandarlo: si no se puede dejar constancia
      // (p. ej. falta la tabla en la base) no se envía, porque sin ese registro
      // el cron lo repetiría en cada pasada de la ventana de 10 minutos.
      try {
        await guardarPreferenciaCharla(abuelo.id, { ultimo_aviso: ahora.toISOString() });
      } catch (err) {
        console.error("[avisoDiario] no se pudo registrar el aviso, se omite:", err);
        continue;
      }

      const pendientes = (await listPreguntasFamilia(abuelo.id)).filter((p) => p.estado === "pendiente");
      const mensaje = armarMensaje(abuelo.nombre, hoy, pendientes[0] ?? null);
      const { enviadas, vencidas } = await enviarNotificacionATodas(subs, {
        titulo: mensaje.titulo,
        cuerpo: mensaje.cuerpo,
        tag: "charla-diaria",
        url: "/abuelo",
      });
      for (const endpoint of vencidas) await eliminarPushSubscriptionPorEndpoint(endpoint);
      if (enviadas > 0) {
        resultado.enviados++;
      } else {
        // No llegó a ningún dispositivo: se libera la reserva para reintentar.
        await guardarPreferenciaCharla(abuelo.id, { ultimo_aviso: guardada?.ultimo_aviso ?? null }).catch(() => {});
      }
    }
  }

  // Aviso por correo a la familia cuando pasan días sin conversar. Una vez al
  // día (a las 12:00) y solo si el servidor lo habilitó con AVISOS_FAMILIA_ACTIVOS.
  if (process.env.AVISOS_FAMILIA_ACTIVOS === "true" && dentroDeVentana("12:00", hora)) {
    const r = await avisarFamiliasSinCharla(abuelos, prefPor, ahora);
    resultado.familia = r;
  }

  return resultado;
}

const DIAS_SIN_CHARLA_PARA_AVISAR = 3;
const HORAS_ENTRE_AVISOS_FAMILIA = 72;

async function avisarFamiliasSinCharla(
  abuelos: Abuelo[],
  prefPor: Map<string, PreferenciaCharla>,
  ahora: Date
): Promise<{ revisadas: number; avisadas: number }> {
  let revisadas = 0;
  let avisadas = 0;
  const hoy = diaChile(ahora);
  for (const abuelo of abuelos) {
    const pref = prefPor.get(abuelo.id);
    if (pref && !pref.activo) continue;
    if (pref?.ultimo_aviso_familia) {
      const horas = (ahora.getTime() - new Date(pref.ultimo_aviso_familia).getTime()) / 3_600_000;
      if (horas < HORAS_ENTRE_AVISOS_FAMILIA) continue;
    }
    // Una persona recién registrada todavía no tuvo tiempo de empezar.
    const edadCuenta = (ahora.getTime() - new Date(abuelo.created_at).getTime()) / DIA_MS;
    if (edadCuenta < DIAS_SIN_CHARLA_PARA_AVISAR) continue;

    revisadas++;
    const fechas = await listConversacionesFechas(
      abuelo.id,
      new Date(ahora.getTime() - 30 * DIA_MS).toISOString()
    );
    const ultima = fechas.length ? fechas[fechas.length - 1].fecha : null;
    const diasSin = ultima
      ? Math.round(
          (new Date(`${hoy}T00:00:00Z`).getTime() - new Date(`${diaChile(ultima)}T00:00:00Z`).getTime()) / DIA_MS
        )
      : null;
    if (diasSin !== null && diasSin < DIAS_SIN_CHARLA_PARA_AVISAR) continue;

    // Igual que con el aviso a la persona mayor: primero se deja constancia.
    try {
      await guardarPreferenciaCharla(abuelo.id, { ultimo_aviso_familia: ahora.toISOString() });
    } catch (err) {
      console.error("[avisoDiario] no se pudo registrar el aviso a la familia, se omite:", err);
      continue;
    }
    const enviados = await enviarEmailAFamilia(abuelo.id, abuelo.nombre, diasSin);
    if (enviados > 0) {
      avisadas++;
    } else {
      await guardarPreferenciaCharla(abuelo.id, { ultimo_aviso_familia: pref?.ultimo_aviso_familia ?? null }).catch(() => {});
    }
  }
  return { revisadas, avisadas };
}
