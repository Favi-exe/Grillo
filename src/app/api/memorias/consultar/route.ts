import { NextRequest, NextResponse } from "next/server";
import { preguntarMemorias } from "@/lib/ai/ragAsk";
import { getAbuelo } from "@/lib/db";
import { AuthError, requireFamiliarConAbuelo } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  try {
    const { abueloId } = await requireFamiliarConAbuelo(req);

    const body = await req.json();
    const { pregunta } = body as { pregunta: string };
    if (!pregunta) {
      return NextResponse.json({ error: "Falta la pregunta" }, { status: 400 });
    }

    const abuelo = await getAbuelo(abueloId);
    if (!abuelo) {
      return NextResponse.json({ error: "Persona mayor no encontrada" }, { status: 404 });
    }

    const resultado = await preguntarMemorias(abueloId, pregunta, abuelo.nombre);
    return NextResponse.json(resultado);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/memorias/consultar]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
