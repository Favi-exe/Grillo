"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import type { Memoria } from "@/lib/types";
import { HeartIcon, PeopleIcon, CaraAltaIcon, CaraNeutralIcon, CaraBajaIcon } from "@/components/icons";
import { balanceDe, etiquetaDe } from "@/lib/emociones";

const PAGINA = 6;

const ESTILO_BALANCE = {
  alto: { Icono: CaraAltaIcon, texto: "text-gold-600", fondo: "bg-gold-400/20" },
  neutral: { Icono: CaraNeutralIcon, texto: "text-sand-700", fondo: "bg-sand-300" },
  bajo: { Icono: CaraBajaIcon, texto: "text-clay-600", fondo: "bg-clay-400/20" },
} as const;

function fechaLegible(iso: string): string {
  const texto = new Date(iso).toLocaleDateString("es-419", { day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const MemoriaCard = memo(function MemoriaCard({ m }: { m: Memoria }) {
  const { Icono, texto, fondo } = ESTILO_BALANCE[balanceDe(m.emocion_detectada)];
  return (
    <li className="border border-sand-300 rounded-3xl p-4 bg-sand-50/60 animate-pop-in">
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center ${fondo} ${texto}`}>
          <Icono className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <p className={`font-heading font-semibold ${texto}`}>{etiquetaDe(m.emocion_detectada)}</p>
          <p className="text-sm text-sand-600">{fechaLegible(m.fecha)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-sm px-2.5 py-1 rounded-full bg-dusk-100 text-dusk-700 font-medium">
          {m.tema}
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
      </div>

      <p className="text-lg text-sand-900 leading-relaxed">{m.resumen}</p>
    </li>
  );
});

export default function MemoriasList() {
  const [memorias, setMemorias] = useState<Memoria[]>([]);
  const [filtroTema, setFiltroTema] = useState<string>("todos");
  const [cargando, setCargando] = useState(true);
  const [visibles, setVisibles] = useState(PAGINA);

  useEffect(() => {
    fetchFamiliar("/api/memorias")
      .then((res) => res.json())
      .then((data) => setMemorias(data.memorias ?? []))
      .finally(() => setCargando(false));
  }, []);

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
          Todavía no hay historias guardadas. A medida que converse con Griyo, van a ir apareciendo aquí.
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
