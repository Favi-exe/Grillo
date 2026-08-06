import { NextRequest, NextResponse } from "next/server";
import { preguntarMemorias } from "@/lib/ai/ragAsk";
import { getAbuelo } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { abueloId, pregunta } = body as { abueloId: string; pregunta: string };

  if (!abueloId || !pregunta) {
    return NextResponse.json({ error: "Faltan abueloId o pregunta" }, { status: 400 });
  }

  const abuelo = await getAbuelo(abueloId);
  if (!abuelo) {
    return NextResponse.json({ error: "Abuelo no encontrado" }, { status: 404 });
  }

  const resultado = await preguntarMemorias(abueloId, pregunta, abuelo.nombre);
  return NextResponse.json(resultado);
}
