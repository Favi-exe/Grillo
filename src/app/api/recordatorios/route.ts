import { NextRequest, NextResponse } from "next/server";
import { listRecordatorios, createRecordatorio } from "@/lib/db";
import type { TipoRecordatorio } from "@/lib/types";

export async function GET(req: NextRequest) {
  const abueloId = req.nextUrl.searchParams.get("abueloId");
  if (!abueloId) {
    return NextResponse.json({ error: "Falta abueloId" }, { status: 400 });
  }
  const recordatorios = await listRecordatorios(abueloId);
  return NextResponse.json({ recordatorios });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { abueloId, tipo, descripcion, hora, frecuencia, creadoPor } = body as {
    abueloId: string;
    tipo: TipoRecordatorio;
    descripcion: string;
    hora: string;
    frecuencia: "una_vez" | "diario" | "semanal";
    creadoPor: string;
  };

  if (!abueloId || !descripcion || !hora) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const recordatorio = await createRecordatorio({
    abuelo_id: abueloId,
    tipo: tipo ?? "otro",
    descripcion,
    hora,
    frecuencia: frecuencia ?? "una_vez",
    creado_por: creadoPor ?? "familiar",
    activo: true,
    ultima_notificacion: null,
  });

  return NextResponse.json({ recordatorio }, { status: 201 });
}
