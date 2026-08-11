"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { fetchAbuelo } from "@/lib/auth/fetchConAuth";
import type { ChatMessage } from "@/lib/types";
import { MicIcon, SendIcon } from "@/components/icons";

type Estado = "idle" | "escuchando" | "pensando" | "hablando";

const MessageBubble = memo(function MessageBubble({ m }: { m: ChatMessage }) {
  const esUsuario = m.role === "user";
  return (
    <div
      className={`max-w-[85%] px-5 py-3.5 rounded-3xl text-lg leading-relaxed shadow-warm-sm animate-pop-in ${
        esUsuario
          ? "self-end bg-ember-600 text-white rounded-br-lg"
          : "self-start bg-white text-sand-900 rounded-bl-lg"
      }`}
    >
      {m.content}
    </div>
  );
});

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 self-start bg-white px-5 py-4 rounded-3xl rounded-bl-lg shadow-warm-sm animate-pop-in" aria-label="Griyo está pensando">
      <span className="w-2.5 h-2.5 rounded-full bg-dusk-400 animate-think-dot" />
      <span className="w-2.5 h-2.5 rounded-full bg-dusk-400 animate-think-dot stagger-1" />
      <span className="w-2.5 h-2.5 rounded-full bg-dusk-400 animate-think-dot stagger-2" />
    </div>
  );
}

export default function VoiceChat() {
  const [historia, setHistoria] = useState<ChatMessage[]>([]);
  const [estado, setEstado] = useState<Estado>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const finRef = useRef<HTMLDivElement | null>(null);

  const { disponible: sttDisponible, escuchando, transcripcion, error: sttError, iniciar, detener } =
    useSpeechRecognition("es-419");
  const { disponible: ttsDisponible, hablando, hablar } = useSpeechSynthesis("es-419");

  const ultimaTranscripcionEnviada = useRef<string>("");

  useEffect(() => {
    setEstado(escuchando ? "escuchando" : estado === "escuchando" ? "idle" : estado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escuchando]);

  useEffect(() => {
    if (hablando) setEstado("hablando");
    else if (estado === "hablando") setEstado("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hablando]);

  // Cuando el reconocimiento termina (onend) y hay transcripción, la mandamos.
  useEffect(() => {
    if (!escuchando && transcripcion && transcripcion !== ultimaTranscripcionEnviada.current) {
      ultimaTranscripcionEnviada.current = transcripcion;
      enviarMensaje(transcripcion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escuchando, transcripcion]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [historia, estado]);

  async function enviarMensaje(texto: string) {
    if (!texto.trim()) return;
    setErrorMsg(null);
    setEstado("pensando");

    try {
      const res = await fetchAbuelo("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historia, mensaje: texto }),
      });
      if (!res.ok) throw new Error(`Chat respondió ${res.status}`);
      const data = await res.json();
      setHistoria(data.historia);
      await reproducirRespuesta(data.reply as string);
    } catch (err) {
      console.error(err);
      setErrorMsg("Uy, no pude escuchar bien a Griyo. ¿Probamos de nuevo?");
      setEstado("idle");
    }
  }

  async function reproducirRespuesta(texto: string) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json();

      if (data.audioBase64) {
        const audio = new Audio(`data:${data.mimeType};base64,${data.audioBase64}`);
        audioRef.current = audio;
        setEstado("hablando");
        audio.onended = () => setEstado("idle");
        await audio.play();
        return;
      }

      if (ttsDisponible) {
        hablar(texto);
      } else {
        setEstado("idle");
      }
    } catch (err) {
      console.error("[tts]", err);
      if (ttsDisponible) hablar(texto);
      else setEstado("idle");
    }
  }

  function handleMicClick() {
    if (escuchando) {
      detener();
      return;
    }
    if (!sttDisponible) {
      setErrorMsg(
        "Tu navegador no soporta reconocimiento de voz. Prueba con Chrome, o escribe tu mensaje abajo."
      );
      return;
    }
    setErrorMsg(null);
    iniciar();
  }

  function handleEnvioTexto(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("mensaje") as HTMLInputElement;
    if (input.value.trim()) {
      enviarMensaje(input.value.trim());
      input.value = "";
    }
  }

  const textoBoton =
    estado === "escuchando"
      ? "Te escucho..."
      : estado === "pensando"
      ? "Pensando..."
      : estado === "hablando"
      ? "Hablando..."
      : "Toca para hablar";

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Escenario de atardecer — el momento especial de la app. Todo lo demás
          en el resto de la interfaz vive en tonos arena; este gradiente
          aparece solo aquí para señalar "este es el corazón de Griyo". */}
      <div className="relative rounded-5xl bg-dusk p-5 sm:p-7 shadow-warm-lg">
        <div className="w-full bg-sand-50/95 backdrop-blur-sm rounded-4xl shadow-inner p-4 mb-6 min-h-[180px] flex flex-col gap-3">
          {historia.length === 0 && (
            <p className="text-center text-sand-700 py-8 text-lg">
              Toca el botón y empieza a hablar con Griyo.
            </p>
          )}
          {historia.map((m, i) => (
            <MessageBubble key={i} m={m} />
          ))}
          {estado === "pensando" && <ThinkingDots />}
          <div ref={finRef} />
        </div>

        <div className="flex flex-col items-center">
          {errorMsg && (
            <p className="text-white bg-clay-600/90 rounded-2xl px-4 py-2 mb-4 text-center max-w-sm">
              {errorMsg}
            </p>
          )}
          {sttError && !errorMsg && (
            <p className="text-white bg-clay-600/90 rounded-2xl px-4 py-2 mb-4 text-center max-w-sm">
              Error de micrófono: {sttError}
            </p>
          )}

          <button
            onClick={handleMicClick}
            disabled={estado === "pensando" || estado === "hablando"}
            aria-label={textoBoton}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-warm-lg ring-4 ring-white/80 transition-[background-color,transform] disabled:cursor-not-allowed active:scale-[0.97] ${
              escuchando ? "bg-clay-500" : "bg-ember-600 hover:bg-ember-700"
            } ${estado === "pensando" || estado === "hablando" ? "opacity-80" : ""}`}
          >
            {/* Chirrido: el ritmo de pulso de un grillo real (dos latidos cortos + pausa),
                la firma de movimiento de Griyo — activo mientras escucha. */}
            {escuchando && (
              <span className="absolute inset-0 rounded-full bg-clay-400 animate-chirp-active" />
            )}
            {estado === "idle" && (
              <span className="absolute inset-0 rounded-full bg-ember-400 animate-chirp-idle" />
            )}
            {estado === "hablando" && (
              <span className="relative z-10 flex items-end gap-1 h-10">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`w-2 rounded-full bg-white origin-bottom animate-wave stagger-${(i % 4) + 1}`}
                    style={{ height: "100%" }}
                  />
                ))}
              </span>
            )}
            {estado !== "hablando" && (
              <MicIcon className="relative z-10 w-12 h-12 text-white" />
            )}
          </button>
          <p className="mt-4 text-xl font-semibold text-white drop-shadow-sm">{textoBoton}</p>
        </div>
      </div>

      <form onSubmit={handleEnvioTexto} className="w-full mt-6 flex gap-2">
        <input
          name="mensaje"
          type="text"
          placeholder="O escribe aquí tu mensaje..."
          className="flex-1 min-w-0 min-h-[52px] rounded-full border-2 border-sand-400 bg-white px-5 text-lg text-sand-900 placeholder:text-sand-600 focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400"
        />
        <button
          type="submit"
          aria-label="Enviar mensaje"
          className="min-w-[52px] min-h-[52px] bg-dusk-700 hover:bg-dusk-800 text-white px-5 rounded-full font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <SendIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
}
