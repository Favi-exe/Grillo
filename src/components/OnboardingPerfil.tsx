"use client";

import { useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { CricketMark } from "@/components/icons";

export default function OnboardingPerfil({ onListo }: { onListo: () => void }) {
  const [nombre, setNombre] = useState("");
  const [relacion, setRelacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetchFamiliar("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, relacionConAbuelo: relacion }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "No se pudo guardar");
      onListo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setCargando(false);
    }
  }

  const inputCls =
    "min-h-[52px] w-full border-2 border-sand-400 rounded-2xl px-4 text-lg bg-white focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 bg-sand-200">
      <div className="w-16 h-16 rounded-3xl bg-white shadow-warm-sm flex items-center justify-center">
        <CricketMark className="w-8 h-8 text-ember-600" />
      </div>
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-warm-sm">
        <h1 className="font-heading text-2xl font-semibold text-sand-900 mb-1">
          Un par de datos tuyos
        </h1>
        <p className="text-sand-700 mb-4">Así sabemos cómo llamarte dentro de la app.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            required
            placeholder="Tu nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Relación con la persona mayor (ej. hija, nieto)"
            value={relacion}
            onChange={(e) => setRelacion(e.target.value)}
            className={inputCls}
          />
          {error && <p className="text-clay-600">{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            className="min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white rounded-2xl font-semibold disabled:opacity-60 transition-colors"
          >
            {cargando ? "Guardando..." : "Continuar"}
          </button>
        </form>
      </div>
    </main>
  );
}
