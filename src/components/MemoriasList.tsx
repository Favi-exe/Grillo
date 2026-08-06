"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { Memoria } from "@/lib/types";
import { HeartIcon, PeopleIcon } from "@/components/icons";

const PAGINA = 6;

const EMOCION_ESTILO: Record<string, string> = {
  nostalgia: "bg-ember-100 text-ember-700",
  alegria: "bg-gold-400/25 text-gold-600",
  "alegría": "bg-gold-400/25 text-gold-600",
  orgullo: "bg-dusk-100 text-dusk-700",
  tristeza: "bg-sand-300 text-sand-800",
  amor: "bg-clay-400/20 text-clay-600",
  neutral: "bg-sand-200 text-sand-800",
};

function estiloEmocion(emocion: string): string {
  return EMOCION_ESTILO[emocion.toLowerCase()] ?? "bg-sand-200 text-sand-800";
}

const MemoriaCard = memo(function MemoriaCard({ m }: { m: Memoria }) {
  return (
    <li className="border border-sand-300 rounded-3xl p-4 bg-sand-50/60 animate-pop-in">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-sm px-2.5 py-1 rounded-full bg-dusk-100 text-dusk-700 font-medium">
          {m.tema}
        </span>
        <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${estiloEmocion(m.emocion_detectada)}`}>
          {m.emocion_detectada}
        </span>
        {m.personas_mencionadas?.map((p) => (
          <span
            key={p}
            className="text-sm px-2.5 py-1 rounded-full bg-white border border-sand-300 text-sand-800 flex items-center gap-1"
          >
            <PeopleIcon className="w-3.5 h-3.5" />
            {p}
          </span>
        ))}
        <span className="text-sm text-sand-600 ml-auto">
          {new Date(m.fecha).toLocaleDateString("es-419")}
        </span>
      </div>
      <p className="text-lg text-sand-900 leading-relaxed">{m.resumen}</p>
    </li>
  );
});

export default function MemoriasList({ abueloId }: { abueloId: string }) {
  const [memorias, setMemorias] = useState<Memoria[]>([]);
  const [filtroTema, setFiltroTema] = useState<string>("todos");
  const [cargando, setCargando] = useState(true);
  const [visibles, setVisibles] = useState(PAGINA);

  useEffect(() => {
    fetch(`/api/memorias?abueloId=${abueloId}`)
      .then((res) => res.json())
      .then((data) => setMemorias(data.memorias ?? []))
      .finally(() => setCargando(false));
  }, [abueloId]);

  const temas = useMemo(() => {
    const set = new Set(memorias.map((m) => m.tema).filter(Boolean));
    return ["todos", ...Array.from(set)];
  }, [memorias]);

  const filtradas = useMemo(
    () => (filtroTema === "todos" ? memorias : memorias.filter((m) => m.tema === filtroTema)),
    [memorias, filtroTema]
  );

  // Paginación simple en vez de renderizar todo de una — evita que la lista
  // se ponga pesada a medida que se acumulan historias.
  const visiblesEnPagina = useMemo(() => filtradas.slice(0, visibles), [filtradas, visibles]);

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-heading text-lg font-semibold text-sand-900 flex items-center gap-2">
          <HeartIcon className="w-5 h-5 text-clay-500" />
          Historias capturadas ({memorias.length})
        </h2>
        <select
          value={filtroTema}
          onChange={(e) => {
            setFiltroTema(e.target.value);
            setVisibles(PAGINA);
          }}
          className="min-h-[44px] border-2 border-sand-400 rounded-xl px-3 text-base bg-white focus:outline-none focus:ring-4 focus:ring-ember-200"
        >
          {temas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {cargando && <p className="text-sand-700">Cargando...</p>}
      {!cargando && filtradas.length === 0 && (
        <p className="text-sand-700 text-lg">
          Todavía no hay historias guardadas. A medida que converse con Grillo, van a ir apareciendo aquí.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {visiblesEnPagina.map((m) => (
          <MemoriaCard key={m.id} m={m} />
        ))}
      </ul>

      {visibles < filtradas.length && (
        <button
          onClick={() => setVisibles((v) => v + PAGINA)}
          className="mt-4 w-full min-h-[48px] rounded-2xl border-2 border-dusk-300 text-dusk-700 font-semibold hover:bg-dusk-50 transition-colors"
        >
          Ver más historias
        </button>
      )}
    </div>
  );
}
