"use client";

import { useEffect, useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { PlusIcon, TrashIcon, CheckIcon } from "@/components/icons";
import type { PreguntaFamilia } from "@/lib/types";

// Vista familiar: dejar armadas preguntas que Griyo le va a mostrar a la
// persona mayor (tarjeta en su pantalla y, con naturalidad, en la charla).
export default function PreguntasFamilia({ nombrePersona }: { nombrePersona: string }) {
  const [preguntas, setPreguntas] = useState<PreguntaFamilia[]>([]);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const res = await fetchFamiliar("/api/preguntas-familia");
    if (!res.ok) return;
    const data = await res.json();
    setPreguntas(data.preguntas ?? []);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetchFamiliar("/api/preguntas-familia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar la pregunta.");
      setTexto("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar la pregunta.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(id: string) {
    await fetchFamiliar(`/api/preguntas-familia/${id}`, { method: "DELETE" });
    await cargar();
  }

  const pendientes = preguntas.filter((p) => p.estado === "pendiente");
  const respondidas = preguntas.filter((p) => p.estado === "respondida");

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5">
      <h2 className="font-heading text-lg font-semibold text-sand-900 mb-1">
        Preguntas para {nombrePersona}
      </h2>
      <p className="text-base text-sand-700 mb-4">
        Deja preguntas que quieras que Griyo le haga. Le aparecen en su pantalla y Griyo también
        se las puede traer a la charla. Lo que responda queda guardado en su libro.
      </p>

      <form onSubmit={agregar} className="flex gap-2 mb-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={300}
          placeholder="Ej: ¿Cómo conociste al abuelo?"
          className="flex-1 min-w-0 min-h-[52px] border-2 border-sand-400 rounded-2xl px-4 text-lg bg-white focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400"
        />
        <button
          type="submit"
          disabled={guardando || !texto.trim()}
          className="min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white px-5 rounded-2xl font-semibold flex items-center gap-2 disabled:opacity-60 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Agregar
        </button>
      </form>
      {error && <p className="text-clay-600 text-base mb-2">{error}</p>}

      {preguntas.length === 0 ? (
        <p className="text-sand-700 text-base mt-3">Todavía no dejaste preguntas.</p>
      ) : (
        <ul className="flex flex-col gap-2 mt-3">
          {[...pendientes, ...respondidas].map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                p.estado === "pendiente" ? "bg-sand-100" : "bg-sand-200/70"
              }`}
            >
              <span className="flex-1 min-w-0 text-lg text-sand-900">{p.texto}</span>
              {p.estado === "respondida" ? (
                <span className="shrink-0 flex items-center gap-1 text-sm text-ember-700 bg-ember-100 px-2.5 py-1 rounded-full">
                  <CheckIcon className="w-4 h-4" />
                  Respondida
                </span>
              ) : (
                <span className="shrink-0 text-sm text-sand-700 bg-white/70 px-2.5 py-1 rounded-full">
                  Pendiente
                </span>
              )}
              <button
                onClick={() => borrar(p.id)}
                aria-label="Borrar pregunta"
                className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-clay-600 hover:bg-clay-400/15 transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
