import { NextRequest, NextResponse } from "next/server";
import { chatWithGrillo } from "@/lib/ai/claude";
import { getAbuelo, createConversacion } from "@/lib/db";
import type { ChatMessage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      abueloId,
      usuarioId,
      historia,
      mensaje,
    }: { abueloId: string; usuarioId: string; historia: ChatMessage[]; mensaje: string } = body;

    if (!abueloId || !mensaje) {
      return NextResponse.json({ error: "Falta abueloId o mensaje" }, { status: 400 });
    }

    const abuelo = await getAbuelo(abueloId);
    if (!abuelo) {
      return NextResponse.json({ error: "Abuelo no encontrado" }, { status: 404 });
    }

    const result = await chatWithGrillo(
      { abueloId, usuarioId: usuarioId ?? "desconocido" },
      abuelo.nombre,
      abuelo.notas_generales,
      historia ?? [],
      mensaje
    );

    const nuevaHistoria: ChatMessage[] = [
      ...(historia ?? []),
      { role: "user", content: mensaje, timestamp: new Date().toISOString() },
      { role: "assistant", content: result.reply, timestamp: new Date().toISOString() },
    ];

    createConversacion({
      abuelo_id: abueloId,
      fecha: new Date().toISOString(),
      transcripcion_completa: nuevaHistoria,
    }).catch((err) => console.error("[chat] no se pudo persistir conversación:", err));

    return NextResponse.json({
      reply: result.reply,
      toolCalls: result.toolCalls,
      fuente: result.fuente,
      historia: nuevaHistoria,
    });
  } catch (err) {
    console.error("[api/chat] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
