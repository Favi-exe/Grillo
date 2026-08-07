import { NextRequest, NextResponse } from "next/server";
import { listRecordatorios, updateRecordatorio, deleteRecordatorio } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";

async function esDeMiAbuelo(abueloId: string, recordatorioId: string): Promise<boolean> {
  const propios = await listRecordatorios(abueloId);
  return propios.some((r) => r.id === recordatorioId);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    if (!(await esDeMiAbuelo(abueloId, params.id))) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const patch = await req.json();
    delete (patch as Record<string, unknown>).abuelo_id; // no se puede reasignar de familia
    const actualizado = await updateRecordatorio(params.id, patch);
    if (!actualizado) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({ recordatorio: actualizado });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/recordatorios/[id] PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    if (!(await esDeMiAbuelo(abueloId, params.id))) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const ok = await deleteRecordatorio(params.id);
    if (!ok) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/recordatorios/[id] DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
