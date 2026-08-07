import { NextRequest, NextResponse } from "next/server";
import { chatWithGrillo } from "@/lib/ai/claude";
import { getAbuelo, createConversacion } from "@/lib/db";
import { AuthError, requireAbueloAccess } from "@/lib/auth/server";
import type { ChatMessage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { abueloId } = await requireAbueloAccess(req);

    const body = await req.json();
    const { historia, mensaje }: { historia: ChatMessage[]; mensaje: string } = body;
    if (!mensaje) {
      return NextResponse.json({ error: "Falta el mensaje" }, { status: 400 });
    }

    const abuelo = await getAbuelo(abueloId);
    if (!abuelo) {
      return NextResponse.json({ error: "Persona mayor no encontrada" }, { status: 404 });
    }

    // No hay cuenta de auth para el abuelo — "creado_por" usa su propio
    // abuelo_id como sentinel de "esto lo pidió él mismo por voz".
    const result = await chatWithGrillo(
      { abueloId, usuarioId: abueloId },
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
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/chat] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
