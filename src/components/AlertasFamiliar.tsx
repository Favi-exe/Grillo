"use client";

import { useEffect, useState } from "react";
import { AlertIcon, CheckIcon } from "@/components/icons";
import type { AlertaEmergencia } from "@/lib/types";

/**
 * La familia solo recibe/gestiona la alerta que Carlos dispara desde su
 * botón de emergencia (ver BotonEmergencia.tsx) — nunca la genera ella
 * misma. Poll simple cada 8s, suficiente para una demo/MVP.
 */
export default function AlertasFamiliar({ abueloId }: { abueloId: string }) {
  const [alertas, setAlertas] = useState<AlertaEmergencia[]>([]);
  const [resolviendo, setResolviendo] = useState(false);

  async function cargar() {
    try {
      const res = await fetch(`/api/emergencia?abueloId=${abueloId}`);
      const data = await res.json();
      setAlertas(data.alertas ?? []);
    } catch (err) {
      console.error("[AlertasFamiliar]", err);
    }
  }

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abueloId]);

  const activa = alertas.find((a) => a.estado === "activa");

  async function marcarResuelta() {
    if (!activa) return;
    setResolviendo(true);
    try {
      await fetch(`/api/emergencia/${activa.id}`, { method: "PATCH" });
      await cargar();
    } finally {
      setResolviendo(false);
    }
  }

  if (activa) {
    return (
      <div className="bg-clay-500 text-white rounded-3xl shadow-warm p-5 flex items-center gap-4 flex-wrap animate-pop-in">
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center animate-glow-pulse">
          <AlertIcon className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-[180px]">
          <h2 className="font-heading text-lg font-semibold">Carlos pidió ayuda</h2>
          <p className="text-white/90">
            {new Date(activa.fecha).toLocaleTimeString("es-419", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            — contáctalo ahora
          </p>
        </div>
        <button
          onClick={marcarResuelta}
          disabled={resolviendo}
          className="min-h-[48px] bg-white text-clay-600 px-5 rounded-2xl font-semibold hover:bg-clay-50 disabled:opacity-60 transition-colors flex items-center gap-2"
        >
          <CheckIcon className="w-5 h-5" />
          Ya hablé con él
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5 flex items-center gap-4">
      <span className="w-11 h-11 shrink-0 rounded-2xl bg-dusk-100 text-dusk-700 flex items-center justify-center">
        <CheckIcon className="w-6 h-6" />
      </span>
      <div>
        <h2 className="font-heading text-lg font-semibold text-sand-900">Todo tranquilo</h2>
        <p className="text-base text-sand-700">
          Sin alertas de emergencia. Si Carlos toca su botón de ayuda, va a aparecer aquí al instante.
        </p>
      </div>
    </div>
  );
}
