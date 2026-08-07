"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { CheckIcon } from "@/components/icons";

export default function VincularDispositivo({
  onVinculado,
  nombrePersonaMayor,
}: {
  onVinculado: (token: string) => void;
  nombrePersonaMayor?: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [vinculado, setVinculado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVincular() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetchFamiliar("/api/dispositivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreDispositivo: navigator.userAgent.slice(0, 60) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "No se pudo vincular");
      const data = await res.json();
      onVinculado(data.dispositivo.token as string);
      setVinculado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo vincular");
    } finally {
      setCargando(false);
    }
  }

  if (vinculado) {
    return (
      <div className="bg-white rounded-3xl shadow-warm-sm p-5 flex items-center gap-4 animate-pop-in">
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-ember-100 text-ember-700 flex items-center justify-center">
          <CheckIcon className="w-6 h-6" />
        </span>
        <div className="flex-1">
          <h2 className="font-heading text-lg font-semibold text-sand-900">
            Este dispositivo ya está vinculado
          </h2>
          <p className="text-base text-sand-700">
            Si esta es la tablet/notebook de tu familiar mayor, entrá ahora — no va a volver a
            pedir login.
          </p>
        </div>
        <Link
          href="/abuelo"
          className="min-h-[48px] flex items-center bg-ember-600 hover:bg-ember-700 text-white px-5 rounded-2xl font-semibold transition-colors"
        >
          Abrir como {nombrePersonaMayor || "persona mayor"}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="font-heading text-lg font-semibold text-sand-900">
          Vincular este dispositivo
        </h2>
        <p className="text-base text-sand-700">
          Hacé esto desde la tablet/notebook que va a usar tu familiar mayor — queda configurada
          una sola vez, nunca más pide iniciar sesión.
        </p>
        {error && <p className="text-clay-600 mt-1">{error}</p>}
      </div>
      <button
        onClick={handleVincular}
        disabled={cargando}
        className="min-h-[48px] bg-dusk-700 hover:bg-dusk-800 text-white px-5 rounded-2xl font-semibold disabled:opacity-60 transition-colors"
      >
        {cargando ? "Vinculando..." : "Vincular este dispositivo"}
      </button>
    </div>
  );
}
