"use client";

import { useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { HeartIcon } from "@/components/icons";

export default function LegadoVivoLibro({ abueloNombre }: { abueloNombre: string }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetchFamiliar("/api/legado");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos armar el libro");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Legado Vivo de ${abueloNombre}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos armar el libro");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-10 h-10 shrink-0 rounded-2xl bg-gold-400/25 text-gold-600 flex items-center justify-center">
          <HeartIcon className="w-5 h-5" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-sand-900">El Legado Vivo de {abueloNombre}</h2>
      </div>
      <p className="text-base text-sand-700 mb-4">
        Un pequeño libro con las historias que {abueloNombre} le fue contando a Griyo, listo para
        guardar o imprimir — hoy, o cuando la familia lo necesite.
      </p>
      {error && <p className="text-clay-600 mb-3">{error}</p>}
      <button
        onClick={descargar}
        disabled={cargando}
        className="min-h-[52px] w-full bg-dusk-700 hover:bg-dusk-800 text-white rounded-2xl font-semibold disabled:opacity-60 transition-colors"
      >
        {cargando ? "Armando el libro..." : "Descargar el Legado Vivo (PDF)"}
      </button>
    </div>
  );
}
