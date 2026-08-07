"use client";

import { memo, useEffect, useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import type { Recordatorio, TipoRecordatorio } from "@/lib/types";
import { TipoRecordatorioIcon, TIPO_INFO } from "@/components/TipoRecordatorioIcon";
import { PlusIcon, TrashIcon, PauseIcon, PlayIcon } from "@/components/icons";

const TIPOS: TipoRecordatorio[] = ["medicamento", "agua", "cita", "evento", "otro"];

const RecordatorioFilaFamiliar = memo(function RecordatorioFilaFamiliar({
  r,
  onToggle,
  onEliminar,
}: {
  r: Recordatorio;
  onToggle: (r: Recordatorio) => void;
  onEliminar: (id: string) => void;
}) {
  const info = TIPO_INFO[r.tipo];
  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 transition-opacity ${
        r.activo ? "bg-sand-100" : "bg-sand-200/70 opacity-60"
      }`}
    >
      <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${info.bg} ${info.fg}`}>
        <TipoRecordatorioIcon tipo={r.tipo} className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-[120px] text-lg text-sand-900">{r.descripcion}</span>
      <span className="font-semibold tabular-nums text-sand-800">{r.hora}</span>
      <span className="text-sm text-sand-700 bg-white/70 px-2.5 py-1 rounded-full">{r.frecuencia}</span>
      <button
        onClick={() => onToggle(r)}
        aria-label={r.activo ? "Pausar recordatorio" : "Activar recordatorio"}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-dusk-700 hover:bg-dusk-100 transition-colors"
      >
        {r.activo ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
      </button>
      <button
        onClick={() => onEliminar(r.id)}
        aria-label="Borrar recordatorio"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-clay-600 hover:bg-clay-400/15 transition-colors"
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </li>
  );
});

export default function RecordatoriosFamiliar() {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [tipo, setTipo] = useState<TipoRecordatorio>("medicamento");
  const [descripcion, setDescripcion] = useState("");
  const [hora, setHora] = useState("09:00");
  const [frecuencia, setFrecuencia] = useState<"una_vez" | "diario" | "semanal">("diario");
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const res = await fetchFamiliar("/api/recordatorios");
    const data = await res.json();
    setRecordatorios(data.recordatorios ?? []);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!descripcion.trim()) return;
    setGuardando(true);
    try {
      await fetchFamiliar("/api/recordatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, descripcion, hora, frecuencia }),
      });
      setDescripcion("");
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    await fetchFamiliar(`/api/recordatorios/${id}`, { method: "DELETE" });
    await cargar();
  }

  async function toggleActivo(r: Recordatorio) {
    await fetchFamiliar(`/api/recordatorios/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !r.activo }),
    });
    await cargar();
  }

  const inputCls =
    "min-h-[48px] border-2 border-sand-400 rounded-2xl px-3 text-base bg-white focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400";

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5">
      <h2 className="font-heading text-lg font-semibold text-sand-900 mb-4">Recordatorios</h2>

      <form onSubmit={crear} className="flex flex-wrap gap-2 mb-5 items-center">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoRecordatorio)}
          className={inputCls}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {TIPO_INFO[t].label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className={`${inputCls} flex-1 min-w-[160px]`}
        />
        <input
          type="time"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className={inputCls}
        />
        <select
          value={frecuencia}
          onChange={(e) => setFrecuencia(e.target.value as any)}
          className={inputCls}
        >
          <option value="una_vez">Una vez</option>
          <option value="diario">Diario</option>
          <option value="semanal">Semanal</option>
        </select>
        <button
          type="submit"
          disabled={guardando}
          className="min-h-[48px] bg-ember-600 hover:bg-ember-700 text-white px-5 rounded-2xl font-semibold flex items-center gap-2 disabled:opacity-60 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Agregar
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {recordatorios.map((r) => (
          <RecordatorioFilaFamiliar key={r.id} r={r} onToggle={toggleActivo} onEliminar={eliminar} />
        ))}
        {recordatorios.length === 0 && (
          <p className="text-sand-700 text-base">Todavía no hay recordatorios cargados.</p>
        )}
      </ul>
    </div>
  );
}
