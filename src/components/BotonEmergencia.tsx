"use client";

import { useEffect, useRef, useState } from "react";
import { AlertIcon, CheckIcon } from "@/components/icons";

type Estado = "idle" | "confirmando" | "enviada";

const SEGUNDOS_CONFIRMACION = 3;

/**
 * El botón de emergencia le pertenece a Carlos, no a la familia: es él quien
 * pide ayuda, la familia solo la recibe (ver AlertasFamiliar). Un solo toque
 * dispara una ventana corta de confirmación cancelable — protege contra
 * toques accidentales sin agregar fricción real en una emergencia genuina.
 */
export default function BotonEmergencia({ abueloId }: { abueloId: string }) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [segundosRestantes, setSegundosRestantes] = useState(SEGUNDOS_CONFIRMACION);
  const [alertaActiva, setAlertaActiva] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertaEnviadaRef = useRef(false);

  useEffect(() => {
    fetch(`/api/emergencia?abueloId=${abueloId}`)
      .then((res) => res.json())
      .then((data) => {
        const activa = (data.alertas ?? []).some(
          (a: { estado: string }) => a.estado === "activa"
        );
        setAlertaActiva(activa);
      })
      .catch((err) => console.error("[BotonEmergencia]", err));
  }, [abueloId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function enviarAlerta() {
    // Guarda de idempotencia: el conteo regresivo solo debe disparar una
    // alerta por toque, incluso si algo (ej. StrictMode en desarrollo)
    // reintenta el efecto que la dispara.
    if (alertaEnviadaRef.current) return;
    alertaEnviadaRef.current = true;

    setEstado("enviada");
    setAlertaActiva(true);
    try {
      await fetch("/api/emergencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abueloId }),
      });
    } catch (err) {
      console.error("[BotonEmergencia]", err);
    }
  }

  function iniciarConfirmacion() {
    alertaEnviadaRef.current = false;
    setEstado("confirmando");
    setSegundosRestantes(SEGUNDOS_CONFIRMACION);
    timerRef.current = setInterval(() => {
      // El updater de setState debe ser puro — el efecto secundario
      // (enviar la alerta) se dispara aparte, en el useEffect de abajo.
      setSegundosRestantes((s) => Math.max(0, s - 1));
    }, 1000);
  }

  useEffect(() => {
    if (estado === "confirmando" && segundosRestantes === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      enviarAlerta();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, segundosRestantes]);

  function cancelar() {
    if (timerRef.current) clearInterval(timerRef.current);
    setEstado("idle");
  }

  if (alertaActiva || estado === "enviada") {
    return (
      <div className="w-full max-w-2xl mx-auto mb-6 bg-clay-500 text-white rounded-3xl p-5 flex items-center gap-4 shadow-warm animate-pop-in">
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center">
          <CheckIcon className="w-6 h-6" />
        </span>
        <p className="text-lg font-medium">
          Ya avisé a tu familia. Van a estar pendientes de ti.
        </p>
      </div>
    );
  }

  if (estado === "confirmando") {
    return (
      <div className="w-full max-w-2xl mx-auto mb-6 bg-clay-500 text-white rounded-3xl p-5 flex items-center gap-4 flex-wrap shadow-warm animate-pop-in">
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center animate-glow-pulse">
          <AlertIcon className="w-6 h-6" />
        </span>
        <p className="flex-1 min-w-[160px] text-lg font-medium">
          Avisando a tu familia en {segundosRestantes}...
        </p>
        <button
          onClick={cancelar}
          className="min-h-[48px] bg-white text-clay-600 px-6 rounded-full font-semibold hover:bg-clay-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={iniciarConfirmacion}
      className="w-full max-w-2xl mx-auto mb-6 min-h-[64px] bg-white border-2 border-clay-300 hover:border-clay-500 hover:bg-clay-50 active:scale-[0.99] rounded-3xl px-5 flex items-center gap-3 shadow-warm-sm transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-clay-300"
    >
      <span className="w-11 h-11 shrink-0 rounded-2xl bg-clay-500 text-white flex items-center justify-center">
        <AlertIcon className="w-6 h-6" />
      </span>
      <span className="text-lg font-semibold text-sand-900">Necesito ayuda</span>
    </button>
  );
}
