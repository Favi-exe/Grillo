import { NextRequest, NextResponse } from "next/server";
import {
  deletePreguntaFamilia,
  getPreguntaFamilia,
  marcarPreguntaFamiliaRespondida,
} from "@/lib/db";
import {
  AuthError,
  requireAbueloOFamiliar,
  requireFamiliarConAbuelo,
} from "@/lib/auth/server";

// La persona mayor (o la familia) marca la pregunta como respondida.
// Idempotente: marcar una que ya estaba respondida no falla.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { abueloId } = await requireAbueloOFamiliar(req);
    const pregunta = await getPreguntaFamilia(params.id);
    if (!pregunta || pregunta.abuelo_id !== abueloId) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    const actualizada =
      pregunta.estado === "respondida"
        ? pregunta
        : await marcarPreguntaFamiliaRespondida(pregunta.id);
    return NextResponse.json({ pregunta: actualizada });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/preguntas-familia/[id] PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Solo la familia borra preguntas.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);
    const pregunta = await getPreguntaFamilia(params.id);
    if (!pregunta || pregunta.abuelo_id !== abueloId) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    await deletePreguntaFamilia(pregunta.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/preguntas-familia/[id] DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
