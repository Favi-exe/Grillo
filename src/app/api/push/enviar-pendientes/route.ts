import { NextRequest, NextResponse } from "next/server";
import {
  listTodosRecordatoriosActivos,
  listPushSubscriptions,
  updateRecordatorio,
  eliminarPushSubscriptionPorEndpoint,
} from "@/lib/db";
import { enviarNotificacionATodas, isPushConfigured } from "@/lib/push/webPush";
import type { TipoRecordatorio } from "@/lib/types";

const ZONA_HORARIA = "America/Santiago";

// Copia liviana de las etiquetas de TIPO_INFO (components/TipoRecordatorioIcon.tsx)
// — no se importa ese archivo acá a propósito, para no meter React/JSX en una
// API route que solo necesita el texto.
const TIPO_LABEL: Record<TipoRecordatorio, string> = {
  medicamento: "Medicamento",
  agua: "Agua",
  cita: "Cita médica",
  evento: "Evento familiar",
  otro: "Recordatorio",
};

function horaYFechaActualChile(): { hora: string; fecha: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return {
    fecha: `${get("year")}-${get("month")}-${get("day")}`, // YYYY-MM-DD, para comparar "ya se avisó hoy"
    hora: `${get("hour")}:${get("minute")}`, // HH:MM
  };
}

// Misma fecha local (Chile) que `fecha` (YYYY-MM-DD) para un timestamp ISO.
function esMismoDiaChile(iso: string, fecha: string): boolean {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}` === fecha;
}

/**
 * Dispara las notificaciones push de los recordatorios cuya hora es AHORA
 * (comparando minuto a minuto). Pensado para que lo llame un cron externo
 * cada 1-5 minutos — Vercel Hobby no permite crons más frecuentes que 1 vez
 * al día, así que esto NO se programa con vercel.json (ver PROGRESO.md para
 * las opciones: cron-job.org gratis, GitHub Actions, o pasar a Vercel Pro).
 *
 * Protegido con CRON_SECRET (header Authorization: Bearer <secret>, o
 * ?secret=<secret> en la URL — algunos servicios de cron gratis no dejan
 * mandar headers custom fácil) para que nadie más pueda gatillar envíos.
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET no configurado en el servidor" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const secretQuery = req.nextUrl.searchParams.get("secret");
  if (bearer !== process.env.CRON_SECRET && secretQuery !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Notificaciones push no configuradas (faltan VAPID keys)" }, { status: 503 });
  }

  const { hora, fecha } = horaYFechaActualChile();
  const todos = await listTodosRecordatoriosActivos();
  const pendientes = todos.filter((r) => {
    if (r.hora !== hora) return false;
    // Recordatorio con día calendario fijo (típicamente "una_vez", ej. "el
    // martes 22 a las 13:30"): solo dispara si HOY es ese día. Si ya pasó
    // la fecha y nunca se avisó (el dispositivo estuvo apagado, sin
    // conexión, etc.), se deja como quedó — no se reintenta un día
    // distinto al pedido, para no avisar tarde y confundir.
    if (r.fecha && r.fecha !== fecha) return false;
    // Ya se avisó hoy (evita reenviar en cada tick del cron dentro del
    // mismo minuto, y en el resto del día para "diario"/"semanal").
    if (r.ultima_notificacion && esMismoDiaChile(r.ultima_notificacion, fecha)) return false;
    return true;
  });

  let totalEnviadas = 0;
  const detalle: { recordatorioId: string; abueloId: string; enviadas: number }[] = [];

  for (const r of pendientes) {
    const subs = await listPushSubscriptions(r.abuelo_id);
    const tipoLabel = TIPO_LABEL[r.tipo] ?? "Recordatorio";
    const { enviadas, vencidas } = await enviarNotificacionATodas(subs, {
      titulo: `Griyo — ${tipoLabel}`,
      cuerpo: r.descripcion,
      tag: `recordatorio-${r.id}`,
      url: "/abuelo",
    });
    for (const endpoint of vencidas) {
      await eliminarPushSubscriptionPorEndpoint(endpoint);
    }

    await updateRecordatorio(r.id, {
      ultima_notificacion: new Date().toISOString(),
      // Un recordatorio de una sola vez ya cumplió su función.
      ...(r.frecuencia === "una_vez" ? { activo: false } : {}),
    });

    totalEnviadas += enviadas;
    detalle.push({ recordatorioId: r.id, abueloId: r.abuelo_id, enviadas });
  }

  return NextResponse.json({
    hora,
    revisados: todos.length,
    disparados: pendientes.length,
    totalEnviadas,
    detalle,
  });
}
