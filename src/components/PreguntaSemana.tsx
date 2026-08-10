"use client";

import { useEffect, useState } from "react";
import { fetchAbuelo } from "@/lib/auth/fetchConAuth";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { preguntaDeLaSemana } from "@/lib/preguntasSemana";
import { HeartIcon, MicIcon, SendIcon, CheckIcon } from "@/components/icons";

function claveSemana(): string {
  const inicioAno = new Date(new Date().getFullYear(), 0, 1);
  const dias = Math.floor((Date.now() - inicioAno.getTime()) / 86_400_000);
  const semana = Math.floor((dias + inicioAno.getDay()) / 7);
  return `grillo_pregunta_semana_${new Date().getFullYear()}_${semana}`;
}

export default function PreguntaSemana() {
  const pregunta = preguntaDeLaSemana();
  const [respondida, setRespondida] = useState(false);
  const [respuesta, setRespuesta] = useState("");
  const [replica, setReplica] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const { disponible: sttDisponible, escuchando, transcripcion, iniciar, detener } =
    useSpeechRecognition("es-419");

  useEffect(() => {
    if (localStorage.getItem(claveSemana())) setRespondida(true);
  }, []);

  useEffect(() => {
    if (!escuchando && transcripcion) setRespuesta(transcripcion);
  }, [escuchando, transcripcion]);

  async function enviar() {
    if (!respuesta.trim() || enviando) return;
    setEnviando(true);
    try {
      const res = await fetchAbuelo("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          historia: [],
          mensaje: `Sobre la pregunta de la semana ("${pregunta}"): ${respuesta.trim()}`,
        }),
      });
      const data = await res.json();
      setReplica(data.reply ?? null);
      localStorage.setItem(claveSemana(), "1");
      setRespondida(true);
    } catch (err) {
      console.error("[PreguntaSemana]", err);
    } finally {
      setEnviando(false);
    }
  }

  if (respondida) {
    return (
      <div className="w-full max-w-2xl mx-auto mb-6 bg-white rounded-3xl shadow-warm-sm p-5 flex items-start gap-4 animate-pop-in">
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-ember-100 text-ember-700 flex items-center justify-center">
          <CheckIcon className="w-6 h-6" />
        </span>
        <div>
          <h2 className="font-heading text-lg font-semibold text-sand-900 mb-1">
            Ya respondiste la pregunta de esta semana
          </h2>
          {replica && <p className="text-sand-700">{replica}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 bg-white rounded-3xl shadow-warm-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <HeartIcon className="w-5 h-5 text-clay-500" />
        <h2 className="font-heading text-lg font-semibold text-sand-900">La pregunta de la semana</h2>
      </div>
      <p className="text-lg text-sand-800 mb-4">{pregunta}</p>
      <div className="flex gap-2">
        <input
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder="Escribe o toca el micrófono para responder..."
          className="flex-1 min-h-[52px] rounded-full border-2 border-sand-400 bg-white px-5 text-lg text-sand-900 placeholder:text-sand-600 focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400"
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
    </div>
  );
}
