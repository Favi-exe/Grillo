import { NextRequest, NextResponse } from "next/server";
import { resolverAlertaEmergencia } from "@/lib/db";

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const alerta = await resolverAlertaEmergencia(params.id);
  if (!alerta) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ alerta });
}
