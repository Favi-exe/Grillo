"use client";

import { useEffect, useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { BellIcon, CheckIcon } from "@/components/icons";

interface Estado {
  hora: string;
  activo: boolean;
  dispositivosConNotificaciones: number;
}

// De 06:00 a 21:30, cada media hora.
const HORAS: string[] = [];
for (let h = 6; h <= 21; h++) {
  HORAS.push(`${String(h).padStart(2, "0")}:00`);
  HORAS.push(`${String(h).padStart(2, "0")}:30`);
}

export default function PreferenciaCharla({ nombrePersona }: { nombrePersona: string }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetchFamiliar("/api/preferencias-charla");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "No pudimos cargar el aviso diario");
        if (vivo) setEstado(data as Estado);
      } catch (err) {
        if (vivo) setError(err instanceof Error ? err.message : "No pudimos cargar el aviso diario");
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  async function guardar(cambio: Partial<Pick<Estado, "hora" | "activo">>) {
    if (!estado) return;
    const siguiente = { ...estado, ...cambio };
    setEstado(siguiente);
    setGuardando(true);
    setGuardado(false);
    setError(null);
    try {
      const res = await fetchFamiliar("/api/preferencias-charla", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hora: siguiente.hora, activo: siguiente.activo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar el cambio");
      setGuardado(true);
    } catch (err) {
      setEstado(estado);
      setError(err instanceof Error ? err.message : "No pudimos guardar el cambio");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-10 h-10 shrink-0 rounded-2xl bg-gold-400/25 text-gold-600 flex items-center justify-center">
          <BellIcon className="w-5 h-5" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-sand-900">Aviso diario para conversar</h2>
      </div>
      <p className="text-base text-sand-700 mb-4">
        Cada día, a la hora que elijas, Griyo le manda a {nombrePersona} una notificación invitándole a conversar
        (si hay una pregunta de la familia pendiente, se la recuerda). Si ya conversó ese día, no le avisa.
      </p>

      {!estado && !error && <div className="h-16 rounded-2xl bg-sand-100 animate-pulse" aria-label="Cargando" />}

      {estado && (
        <div className="grid gap-3">
          <label className="flex items-center justify-between gap-3 bg-sand-100 rounded-2xl px-4 py-3 min-h-[52px] cursor-pointer">
            <span className="font-semibold text-sand-900">Avisar todos los días</span>
            <input
              type="checkbox"
              checked={estado.activo}
              onChange={(e) => guardar({ activo: e.target.checked })}
              className="w-6 h-6 accent-ember-600"
            />
          </label>
          <label className={`flex items-center justify-between gap-3 bg-sand-100 rounded-2xl px-4 py-3 min-h-[52px] ${estado.activo ? "" : "opacity-50"}`}>
            <span className="font-semibold text-sand-900">Hora del aviso</span>
            <select
              value={estado.hora}
              disabled={!estado.activo}
              onChange={(e) => guardar({ hora: e.target.value })}
              className="min-h-[44px] rounded-xl border border-sand-500 bg-white px-3 text-base focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
            >
              {HORAS.map((h) => (
                <option key={h} value={h}>
                  {h} h
                </option>
              ))}
            </select>
          </label>

          {estado.activo && estado.dispositivosConNotificaciones === 0 && (
            <p className="text-sm bg-ember-100 text-ember-900 rounded-2xl p-3">
              {nombrePersona} todavía no activó las notificaciones en su dispositivo, así que el aviso no le va a llegar. Hay que abrir
              Griyo en su tablet o celular y tocar «Activar».
            </p>
          )}
          {estado.activo && estado.dispositivosConNotificaciones > 0 && (
            <p className="text-sm text-sand-700 flex items-center gap-1.5">
              <CheckIcon className="w-4 h-4" />
              Notificaciones activas en {estado.dispositivosConNotificaciones}{" "}
              {estado.dispositivosConNotificaciones === 1 ? "dispositivo" : "dispositivos"}.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-clay-600 mt-3" role="alert">{error}</p>}
      {guardando && <p className="text-sm text-sand-700 mt-2">Guardando…</p>}
      {guardado && !guardando && !error && <p className="text-sm text-sand-700 mt-2">Guardado.</p>}
    </div>
  );
}
