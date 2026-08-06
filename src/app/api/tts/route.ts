import { NextRequest, NextResponse } from "next/server";

/**
 * TTS server-side (ElevenLabs). Si no hay key, devuelve useBrowserTTS:true
 * para que el frontend hable con SpeechSynthesis nativo (ver
 * src/hooks/useSpeechSynthesis.ts). Cuando se cargue ELEVENLABS_API_KEY,
 * esta ruta empieza a devolver audio real en base64 sin tocar nada más.
 */

const VOZ_CALIDA_ID = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // "Bella", voz cálida por defecto

export async function POST(req: NextRequest) {
  const { texto } = await req.json();

  if (!texto) {
    return NextResponse.json({ error: "Falta texto" }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ useBrowserTTS: true, texto, fuente: "mock" });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOZ_CALIDA_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: texto,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.6, similarity_boost: 0.8 },
        }),
      }
    );

    if (!res.ok) throw new Error(`ElevenLabs respondió ${res.status}`);

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return NextResponse.json({
      audioBase64: base64,
      mimeType: "audio/mpeg",
      fuente: "real",
    });
  } catch (err) {
    console.error("[api/tts] fallo real, usando mock:", err);
    return NextResponse.json({ useBrowserTTS: true, texto, fuente: "mock" });
  }
}
