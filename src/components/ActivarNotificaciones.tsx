"use client";

import { useSuscripcionPush } from "@/hooks/useSuscripcionPush";
import { BellIcon } from "@/components/icons";

/**
 * Banner para activar notificaciones push de recordatorios en este
 * dispositivo. Sin esto, un recordatorio solo se avisa si la app está
 * abierta y en pantalla en ese momento (ver RecordatoriosPanel) — con el
 * permiso activado, llega como notificación del sistema aunque el
 * navegador esté cerrado.
 *
 * Se muestra una sola vez por dispositivo: apenas queda "activo" o si el
 * navegador no soporta push, desaparece solo.
 */
export default function ActivarNotificaciones() {
  const { estado, activar } = useSuscripcionPush();

  if (estado === "verificando" || estado === "no_soportado" || estado === "activo") {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-4 bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-warm-sm">
      <span className="w-11 h-11 shrink-0 rounded-2xl bg-gold-400/25 text-gold-600 flex items-center justify-center">
        <BellIcon className="w-5 h-5" />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-sand-900">Activa los avisos de recordatorios</p>
        <p className="text-sand-700 text-sm">
          {estado === "denegado"
            ? "Este dispositivo bloqueó las notificaciones — para activarlas hay que habilitarlas en la configuración del navegador."
            : "Así te va a avisar aunque no tengas la pantalla abierta."}
        </p>
      </div>
      {estado !== "denegado" && (
        <button
          onClick={activar}
          disabled={estado === "activando"}
          className="min-h-[44px] shrink-0 bg-ember-600 hover:bg-ember-700 disabled:opacity-60 text-white px-4 rounded-full font-semibold transition-colors"
        >
          {estado === "activando" ? "Activando…" : "Activar"}
        </button>
      )}
    </div>
  );
}
