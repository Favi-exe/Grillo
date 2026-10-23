"use client";

import { useEffect, useState } from "react";
import { fetchAbuelo } from "@/lib/auth/fetchConAuth";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { HeartIcon, MicIcon, SendIcon, VolumeIcon } from "@/components/icons";
import type { PreguntaFamilia } from "@/lib/types";
import GriyoMascota from "@/components/ilustraciones/GriyoMascota";
import CorazonesSubiendo from "@/components/ilustraciones/Corazones";

// Tarjeta de la pantalla de la persona mayor: le muestra, de a una, las
// preguntas que su familia dejó armadas. Responde escribiendo o por voz; la
// respuesta pasa por el chat de Griyo, así queda guardada como memoria del
// libro igual que cualquier otra historia.
export default function PreguntaDeLaFamilia() {
  const [pendientes, setPendientes] = useState<PreguntaFamilia[]>([]);
  const [respuesta, setRespuesta] = useState("");
  const [replica, setReplica] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { disponible: sttDisponible, escuchando, transcripcion, iniciar, detener } =
    useSpeechRecognition("es-419");
  const { disponible: ttsDisponible, hablar } = useSpeechSynthesis("es-419");

  useEffect(() => {
    fetchAbuelo("/api/preguntas-familia")
      .then(async (res) => (res.ok ? res.json() : { preguntas: [] }))
      .then((data) => setPendientes(data.preguntas ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!escuchando && transcripcion) setRespuesta(transcripcion);
  }, [escuchando, transcripcion]);

  const actual = pendientes[0];
  if (!actual) return null;

  async function escuchar() {
    const texto = `${actual.autor_nombre} quiere preguntarte: ${actual.texto}`;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();
      if (data.audioBase64) {
        await new Audio(`data:${data.mimeType};base64,${data.audioBase64}`).play();
        return;
      }
    } catch (err) {
      console.error("[PreguntaDeLaFamilia tts]", err);
    }
    if (ttsDisponible) hablar(texto);
  }

  async function enviar() {
    if (!respuesta.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetchAbuelo("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          historia: [],
          mensaje: `Sobre la pregunta que me dejó ${actual.autor_nombre} ("${actual.texto}"): ${respuesta.trim()}`,
        }),
      });
      if (!res.ok) throw new Error("chat");
      const data = await res.json();
      // Se marca respondida acá y no solo desde el chat: no depende de que el
      // modelo se acuerde de llamar a la herramienta.
      await fetchAbuelo(`/api/preguntas-familia/${actual.id}`, { method: "PATCH" });
      setReplica(data.reply ?? "¡Gracias por contármelo!");
    } catch (err) {
      console.error("[PreguntaDeLaFamilia]", err);
      setError("No pudimos enviar tu respuesta. ¿Probamos de nuevo?");
    } finally {
      setEnviando(false);
    }
  }

  function siguiente() {
    setPendientes((prev) => prev.slice(1));
    setRespuesta("");
    setReplica(null);
    setError(null);
  }

  function masTarde() {
    setPendientes((prev) => [...prev.slice(1), prev[0]]);
    setRespuesta("");
    setError(null);
  }

  if (replica) {
    return (
      <div className="relative w-full max-w-2xl mx-auto mb-6 bg-white rounded-3xl shadow-warm-sm p-5 animate-pop-in">
        <CorazonesSubiendo />
        <div className="flex items-center gap-3 mb-4">
          <GriyoMascota estado="feliz" className="w-14 h-14 shrink-0" />
          <p className="text-lg text-sand-900">{replica}</p>
        </div>
        <button
          onClick={siguiente}
          className="min-h-[52px] w-full bg-ember-600 hover:bg-ember-700 text-white rounded-2xl font-semibold transition-colors"
        >
          {pendientes.length > 1 ? "Ver la siguiente pregunta" : "Listo"}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 bg-white rounded-3xl shadow-warm-sm p-5 ring-2 ring-ember-200 animate-breathe">
      <div className="flex items-center gap-2 mb-2">
        <GriyoMascota estado="escuchando" className="w-14 h-14 -ml-1" />
        <h2 className="font-heading text-lg font-semibold text-sand-900">
          {actual.autor_nombre} quiere saber
        </h2>
      </div>
      <p className="text-xl text-sand-900 mb-3">{actual.texto}</p>
      <button
        onClick={escuchar}
        className="min-h-[48px] mb-4 px-4 rounded-full text-dusk-700 bg-dusk-100 hover:bg-dusk-200 flex items-center gap-2 font-semibold transition-colors"
      >
        <VolumeIcon className="w-5 h-5" />
        Escuchar la pregunta
      </button>
      <div className="flex gap-2">
        <input
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder="Escribe o toca el micrófono para responder..."
          className="flex-1 min-w-0 min-h-[52px] rounded-full border-2 border-sand-400 bg-white px-5 text-lg text-sand-900 placeholder:text-sand-600 focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400"
        />
        {sttDisponible && (
          <button
            onClick={() => (escuchando ? detener() : iniciar())}
            aria-label={escuchando ? "Detener grabación" : "Responder por voz"}
            className={`min-w-[52px] min-h-[52px] rounded-full flex items-center justify-center text-white transition-colors ${
              escuchando ? "bg-clay-500" : "bg-dusk-700 hover:bg-dusk-800"
            }`}
          >
            <MicIcon className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={enviar}
          disabled={!respuesta.trim() || enviando}
          aria-label="Enviar respuesta"
          className="min-w-[52px] min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-colors"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </div>
      {error && <p className="text-clay-600 mt-3">{error}</p>}
      {pendientes.length > 1 && (
        <button onClick={masTarde} className="mt-3 text-sand-700 underline text-base">
          Responder más tarde ({pendientes.length - 1} más)
        </button>
      )}
    </div>
  );
}
