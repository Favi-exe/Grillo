import { NextRequest, NextResponse } from "next/server";
import { listAlertasEmergencia, resolverAlertaEmergencia } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);

    const propias = await listAlertasEmergencia(abueloId);
    if (!propias.some((a) => a.id === params.id)) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const alerta = await resolverAlertaEmergencia(params.id);
    if (!alerta) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    return NextResponse.json({ alerta });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/emergencia/[id] PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
