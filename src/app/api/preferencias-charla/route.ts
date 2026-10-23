import { NextRequest, NextResponse } from "next/server";
import { getPreferenciaCharla, guardarPreferenciaCharla, listPushSubscriptions } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";
import { HORA_CHARLA_POR_DEFECTO } from "@/lib/types";

export const dynamic = "force-dynamic";

const HORA_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const HORA_MIN = "06:00";
const HORA_MAX = "21:30";

function esTablaFaltante(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "42P01" || code === "PGRST205";
}

// A qué hora Griyo invita a la persona mayor a conversar, y si tiene las
// notificaciones activadas en algún dispositivo (sin eso el aviso no llega).
export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    const [pref, subs] = await Promise.all([getPreferenciaCharla(abueloId), listPushSubscriptions(abueloId)]);
    return NextResponse.json({
      hora: pref?.hora ?? HORA_CHARLA_POR_DEFECTO,
      activo: pref?.activo ?? true,
      ultimoAviso: pref?.ultimo_aviso ?? null,
      dispositivosConNotificaciones: subs.length,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/preferencias-charla GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    const body = await req.json().catch(() => ({}));
    const hora = typeof body.hora === "string" ? body.hora : "";
    const activo = body.activo;
    if (!HORA_RE.test(hora) || hora < HORA_MIN || hora > HORA_MAX) {
      return NextResponse.json(
        { error: `La hora tiene que estar entre las ${HORA_MIN} y las ${HORA_MAX}.` },
        { status: 400 }
      );
    }
    if (typeof activo !== "boolean") {
      return NextResponse.json({ error: "Falta indicar si el aviso está activo." }, { status: 400 });
    }
    try {
      const pref = await guardarPreferenciaCharla(abueloId, { hora, activo });
      return NextResponse.json({ hora: pref.hora, activo: pref.activo });
    } catch (err) {
      if (esTablaFaltante(err)) {
        return NextResponse.json(
          { error: "Falta crear la tabla del aviso diario: corre el bloque correspondiente de supabase/schema.sql en Supabase." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/preferencias-charla PUT]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
