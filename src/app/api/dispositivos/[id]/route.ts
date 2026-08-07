import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";
import { listDispositivos, eliminarDispositivo } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);

    // Confirma que el dispositivo sea de este abuelo antes de borrarlo —
    // nadie puede revocar el dispositivo de otra familia adivinando un id.
    const propios = await listDispositivos(abueloId);
    if (!propios.some((d) => d.id === params.id)) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    await eliminarDispositivo(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/dispositivos DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
