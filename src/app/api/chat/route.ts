import { NextRequest, NextResponse } from "next/server";
import { chatWithGrillo, type ChatResult } from "@/lib/ai/claude";
import { getAbuelo, createConversacion, contarConversacionesDesde } from "@/lib/db";
import { AuthError, requireAbueloAccess } from "@/lib/auth/server";
import { chequearYAvisarAnimo } from "@/lib/animo";
import type { ChatMessage } from "@/lib/types";

// Techo de mensajes por persona mayor en una ventana móvil de 24hs — para no
// quemar créditos de la API de Claude si algo queda repitiéndose o alguien
// abusa del chat. Configurable con LIMITE_MENSAJES_DIARIOS; 60 por defecto
// (generoso para uso real, pero corta un loop o un abuso antes de que
// duela la factura).
const LIMITE_MENSAJES_24HS = Number(process.env.LIMITE_MENSAJES_DIARIOS ?? 60);
const VENTANA_LIMITE_MS = 24 * 60 * 60 * 1000;

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

    const desde = new Date(Date.now() - VENTANA_LIMITE_MS).toISOString();
    const usoReciente = await contarConversacionesDesde(abueloId, desde);
    const alcanzoElLimite = usoReciente >= LIMITE_MENSAJES_24HS;

    // No hay cuenta de auth para el abuelo — "creado_por" usa su propio
    // abuelo_id como sentinel de "esto lo pidió él mismo por voz".
    const result: ChatResult = alcanzoElLimite
      ? {
          reply: "Hoy ya charlamos bastante. Descansemos un poco y seguimos mañana, ¿te parece?",
          toolCalls: [],
          fuente: "limite",
        }
      : await chatWithGrillo(
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

    // Una respuesta de "límite alcanzado" no cuenta como uso nuevo — si
    // se guardara, cada intento posterior seguiría empujando la ventana.
    if (!alcanzoElLimite) {
      createConversacion({
        abuelo_id: abueloId,
        fecha: new Date().toISOString(),
        transcripcion_completa: nuevaHistoria,
      }).catch((err) => console.error("[chat] no se pudo persistir conversación:", err));

      // Solo chequea el patrón de ánimo cuando se guardó una memoria nueva
      // esta vuelta — no en cada mensaje, para no gastar una consulta y una
      // eventual llamada extra a Claude de más.
      if (result.toolCalls.some((t) => t.nombre === "guardar_memoria")) {
        try {
          await chequearYAvisarAnimo(abueloId, abuelo.nombre);
        } catch (err) {
          console.error("[chat] fallo chequeando el ánimo:", err);
        }
      }
    }

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
