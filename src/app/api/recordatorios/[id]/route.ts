import { NextRequest, NextResponse } from "next/server";
import { updateRecordatorio, deleteRecordatorio } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = await req.json();
  const actualizado = await updateRecordatorio(params.id, patch);
  if (!actualizado) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ recordatorio: actualizado });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = await deleteRecordatorio(params.id);
  if (!ok) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
