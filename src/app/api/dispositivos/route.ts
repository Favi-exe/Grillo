import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";
import { crearDispositivo, listDispositivos } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    const dispositivos = await listDispositivos(abueloId);
    // El token no se devuelve en el listado (solo al crearlo) — una vez
    // vinculado el dispositivo, no hace falta volver a mostrarlo.
    return NextResponse.json({
      dispositivos: dispositivos.map((d) => ({ ...d, token: undefined })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/dispositivos GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { abueloId, usuarioId } = await requireFamiliarConAbuelo(req);
    const body = await req.json().catch(() => ({}));
    const nombreDispositivo = (body as { nombreDispositivo?: string }).nombreDispositivo;

    const dispositivo = await crearDispositivo({
      abueloId,
      nombreDispositivo: nombreDispositivo || null,
      creadoPor: usuarioId,
    });

    return NextResponse.json({ dispositivo }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/dispositivos POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
