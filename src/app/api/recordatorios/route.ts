import { NextRequest, NextResponse } from "next/server";
import { listRecordatorios, createRecordatorio } from "@/lib/db";
import { AuthError, requireAbueloAccess, requireFamiliarConAbuelo } from "@/lib/auth/server";
import type { TipoRecordatorio } from "@/lib/types";

// Lo puede leer la tablet del abuelo (token de dispositivo o su propia
// sesión si se registró solo), o el familiar logueado (para administrarlos)
// — en todos los casos el abueloId se resuelve del lado del servidor.
export async function GET(req: NextRequest) {
  try {
    let abueloId: string;
    try {
      ({ abueloId } = await requireAbueloAccess(req));
    } catch {
      ({ abueloId } = await requireFamiliarConAbuelo(req));
    }

    const recordatorios = await listRecordatorios(abueloId);
    return NextResponse.json({ recordatorios });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/recordatorios GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Alta manual: solo el familiar (la creación por voz del abuelo pasa por
// /api/chat → guardar_memoria/crear_recordatorio directo, no por acá).
export async function POST(req: NextRequest) {
  try {
    const { abueloId, usuarioId } = await requireFamiliarConAbuelo(req);

    const body = await req.json();
    const { tipo, descripcion, hora, frecuencia } = body as {
      tipo: TipoRecordatorio;
      descripcion: string;
      hora: string;
      frecuencia: "una_vez" | "diario" | "semanal";
    };

    if (!descripcion || !hora) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const recordatorio = await createRecordatorio({
      abuelo_id: abueloId,
      tipo: tipo ?? "otro",
      descripcion,
      hora,
      frecuencia: frecuencia ?? "una_vez",
      creado_por: usuarioId,
      activo: true,
      ultima_notificacion: null,
    });

    return NextResponse.json({ recordatorio }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/recordatorios POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
