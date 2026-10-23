"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { fetchAbuelo } from "@/lib/auth/fetchConAuth";
import type { ChatMessage } from "@/lib/types";
import { MicIcon, SendIcon } from "@/components/icons";
import GriyoMascota from "@/components/ilustraciones/GriyoMascota";
import { ParejaSaludando } from "@/components/ilustraciones/Escenas";

type Estado = "idle" | "escuchando" | "pensando" | "hablando";

const MessageBubble = memo(function MessageBubble({ m }: { m: ChatMessage }) {
  const esUsuario = m.role === "user";
  if (esUsuario) {
    return (
      <div className="max-w-[85%] self-end px-5 py-3.5 rounded-3xl rounded-br-lg bg-ember-600 text-white text-lg leading-relaxed shadow-warm-sm animate-slide-right">
        {m.content}
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2 self-start max-w-[92%] animate-slide-left">
      <GriyoMascota estado="quieto" className="w-10 h-10 shrink-0 -mb-1" />
      <div className="px-5 py-3.5 rounded-3xl rounded-bl-lg bg-white text-sand-900 text-lg leading-relaxed shadow-warm-sm">
        {m.content}
      </div>
    </div>
  );
});

// Estrellitas y nubes que decoran el escenario de atardecer. Puro adorno: no
// reciben clics ni los lee un lector de pantalla.
const ESTRELLAS = [
  { x: "8%", y: "9%", t: 10, d: "0s" },
  { x: "24%", y: "4%", t: 7, d: "0.8s" },
  { x: "42%", y: "11%", t: 8, d: "1.6s" },
  { x: "63%", y: "5%", t: 11, d: "0.4s" },
  { x: "82%", y: "10%", t: 8, d: "1.2s" },
  { x: "93%", y: "22%", t: 6, d: "2.1s" },
  { x: "4%", y: "30%", t: 6, d: "1.9s" },
];

function DecoracionEscenario() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-5xl">
      <div className="absolute -top-2 left-[6%] w-24 h-7 rounded-full bg-white/25 blur-[2px] animate-drift" />
      <div className="absolute top-8 right-[8%] w-20 h-6 rounded-full bg-white/20 blur-[2px] animate-drift" style={{ animationDelay: "-6s" }} />
      {ESTRELLAS.map((e, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute text-gold-400 animate-twinkle"
          style={{ left: e.x, top: e.y, width: e.t, height: e.t, animationDelay: e.d }}
        >
          <path fill="currentColor" d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" />
        </svg>
      ))}
    </div>
  );
}

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
  const ultimoMensajeFueVoz = useRef(false);

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
      ultimoMensajeFueVoz.current = true;
      enviarMensaje(transcripcion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escuchando, transcripcion]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [historia, estado]);

  // Conversación "audio por audio": si el último mensaje lo mandaste
  // hablando, apenas Griyo termina de responder volvemos a escuchar solos,
  // sin que haya que tocar el botón de nuevo en cada turno.
  const estadoAnteriorRef = useRef<Estado>("idle");
  useEffect(() => {
    const veniaHablando = estadoAnteriorRef.current === "hablando";
    estadoAnteriorRef.current = estado;
    if (veniaHablando && estado === "idle" && ultimoMensajeFueVoz.current && sttDisponible) {
      iniciar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  async function enviarMensaje(texto: string) {
    if (!texto.trim()) return;
    setErrorMsg(null);
    setEstado("pensando");

    // Mostramos el mensaje del usuario de inmediato, sin esperar la
    // respuesta del servidor — antes los dos aparecían recién juntos cuando
    // volvía el fetch completo, y en una charla larga quedaba muy raro.
    const historiaConMensaje = [
      ...historia,
      { role: "user" as const, content: texto, timestamp: new Date().toISOString() },
    ];
    setHistoria(historiaConMensaje);

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
      // Si escribe en vez de hablar, no seguimos escuchando solos después —
      // eso solo tiene sentido cuando la charla viene siendo por voz.
      ultimoMensajeFueVoz.current = false;
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
    <div className="w-full max-w-2xl mx-auto mt-16">
      {/* Escenario de atardecer — el momento especial de la app. Todo lo demás
          en el resto de la interfaz vive en tonos arena; este gradiente
          aparece solo aquí para señalar "este es el corazón de Griyo". Griyo
          se asoma por arriba y reacciona a lo que pasa en la charla. */}
      <div className="relative rounded-5xl bg-dusk p-5 sm:p-7 pt-14 shadow-warm-lg">
        <DecoracionEscenario />
        <GriyoMascota
          estado={estado}
          className="absolute left-1/2 -translate-x-1/2 -top-[4.5rem] w-32 h-32 z-10 drop-shadow-[0_8px_10px_rgba(74,59,92,0.35)]"
        />
        <div className="relative w-full bg-sand-50/95 backdrop-blur-sm rounded-4xl shadow-inner p-4 mb-6 min-h-[180px] max-h-[50vh] overflow-y-auto flex flex-col gap-3">
          {historia.length === 0 && (
            <div className="flex flex-col items-center text-center py-2">
              <ParejaSaludando className="w-48 h-auto" />
              <p className="text-sand-800 text-xl font-semibold mt-1">¡Hola! Soy Griyo.</p>
              <p className="text-sand-700 text-lg">Toca el botón y cuéntame cómo va tu día.</p>
            </div>
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

          {estado === "idle" && historia.length === 0 && (
            <div className="mb-2 flex flex-col items-center text-white animate-nudge-down" aria-hidden="true">
              <span className="bg-white/90 text-dusk-800 font-semibold rounded-full px-4 py-1.5 text-lg shadow-warm-sm">¡Toca aquí!</span>
              <svg viewBox="0 0 24 24" className="w-7 h-7 -mt-0.5" fill="currentColor"><path d="M12 20l-8-9h16z" /></svg>
            </div>
          )}

          <div className={estado === "idle" ? "animate-breathe" : undefined}>
            <button
              onClick={handleMicClick}
              disabled={estado === "pensando" || estado === "hablando"}
              aria-label={textoBoton}
              className={`relative w-36 h-36 rounded-full flex items-center justify-center shadow-warm-lg ring-4 ring-white/80 transition-[background-color,transform] disabled:cursor-not-allowed active:scale-[0.95] ${
                escuchando
                  ? "bg-gradient-to-b from-clay-400 to-clay-600"
                  : "bg-gradient-to-b from-ember-400 to-ember-600 hover:from-ember-500 hover:to-ember-700"
              } ${estado === "pensando" || estado === "hablando" ? "opacity-85" : ""}`}
            >
              {/* Ondas de sonido hacia afuera mientras escucha: se nota a simple vista que Griyo está oyendo. */}
              {escuchando && (
                <>
                  <span className="absolute inset-0 rounded-full bg-clay-400/70 animate-ripple" />
                  <span className="absolute inset-0 rounded-full bg-clay-400/60 animate-ripple" style={{ animationDelay: "0.7s" }} />
                  <span className="absolute inset-0 rounded-full bg-clay-400/50 animate-ripple" style={{ animationDelay: "1.4s" }} />
                </>
              )}
              {/* En reposo: dos latidos cortos y pausa, como el chirrido de un grillo. */}
              {estado === "idle" && (
                <span className="absolute inset-0 rounded-full bg-ember-400 animate-chirp-idle" />
              )}
              {estado === "pensando" && (
                <span className="absolute -inset-2 rounded-full border-4 border-dashed border-white/70 animate-spin" style={{ animationDuration: "5s" }} />
              )}
              {estado === "hablando" && (
                <span className="relative z-10 flex items-end gap-1.5 h-12">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`w-2.5 rounded-full bg-white origin-bottom animate-wave stagger-${(i % 4) + 1}`}
                      style={{ height: "100%" }}
                    />
                  ))}
                </span>
              )}
              {estado !== "hablando" && (
                <MicIcon className="relative z-10 w-14 h-14 text-white" />
              )}
            </button>
          </div>
          <p key={textoBoton} className="mt-4 text-2xl font-semibold text-white drop-shadow-sm animate-pop-in">
            {textoBoton}
          </p>
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
