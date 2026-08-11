import { NextRequest, NextResponse } from "next/server";

/**
 * STT server-side (Whisper). No lo usa la UI por defecto — el flujo principal
 * usa la Web Speech API del navegador (ver src/hooks/useSpeechRecognition.ts),
 * que no necesita key. Esta ruta queda lista para cuando se quiera subir el
 * audio grabado y transcribirlo con Whisper en vez del navegador.
 */

const FRASES_MOCK = [
  "Hola Griyo, ¿cómo estás hoy?",
  "Griyo, recuérdame tomar la pastilla a las nueve",
  "Me acuerdo cuando era chico en el pueblo, jugábamos en la plaza hasta que oscurecía",
  "¿Qué tiempo hace hoy?",
];

export async function POST(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    const texto = FRASES_MOCK[Math.floor(Math.random() * FRASES_MOCK.length)];
    return NextResponse.json({ texto, fuente: "mock" });
  }

  try {
    const formData = await req.formData();
    const audio = formData.get("audio");
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "Falta el archivo de audio" }, { status: 400 });
    }

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: openaiKey });

    const file = new File([await audio.arrayBuffer()], "audio.webm", { type: audio.type });
    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "es",
    });

    return NextResponse.json({ texto: transcription.text, fuente: "real" });
  } catch (err) {
    console.error("[api/stt] fallo real, usando mock:", err);
    const texto = FRASES_MOCK[Math.floor(Math.random() * FRASES_MOCK.length)];
    return NextResponse.json({ texto, fuente: "mock" });
  }
}
