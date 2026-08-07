"use client";

import { memo, useEffect, useState } from "react";
import { fetchAbuelo } from "@/lib/auth/fetchConAuth";
import type { Recordatorio } from "@/lib/types";
import { TipoRecordatorioIcon, TIPO_INFO } from "@/components/TipoRecordatorioIcon";
import { BellIcon, CheckIcon } from "@/components/icons";

function horaActual(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const RecordatorioItem = memo(function RecordatorioItem({ r }: { r: Recordatorio }) {
  const info = TIPO_INFO[r.tipo];
  return (
    <li className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-warm-sm">
      <span className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center ${info.bg} ${info.fg}`}>
        <TipoRecordatorioIcon tipo={r.tipo} />
      </span>
      <span className="flex-1 text-lg text-sand-900">{r.descripcion}</span>
      <span className="font-semibold text-lg text-sand-700 tabular-nums">{r.hora}</span>
    </li>
  );
});

export default function RecordatoriosPanel() {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [aviso, setAviso] = useState<Recordatorio | null>(null);

  async function cargar() {
    try {
      const res = await fetchAbuelo("/api/recordatorios");
      const data = await res.json();
      setRecordatorios((data.recordatorios ?? []).filter((r: Recordatorio) => r.activo));
    } catch (err) {
      console.error("[RecordatoriosPanel]", err);
    }
  }

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 15000);
    return () => clearInterval(interval);
  }, []);

  // Revisa cada 20s si algún recordatorio coincide con la hora actual.
  useEffect(() => {
    const check = () => {
      const ahora = horaActual();
      const match = recordatorios.find((r) => r.hora === ahora);
      if (match) setAviso(match);
    };
    const interval = setInterval(check, 20000);
    check();
    return () => clearInterval(interval);
  }, [recordatorios]);

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      {aviso && (
        <div className="bg-gold-400/25 border-2 border-gold-500 rounded-3xl p-4 mb-4 flex items-center gap-3 shadow-warm-sm animate-pop-in">
          <span className="w-12 h-12 shrink-0 rounded-2xl bg-gold-500 text-white flex items-center justify-center animate-glow-pulse">
            <BellIcon className="w-6 h-6" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-sand-900 text-lg">¡Es hora de recordar!</p>
            <p className="text-sand-800">{aviso.descripcion}</p>
          </div>
          <button
            onClick={() => setAviso(null)}
            className="min-h-[48px] bg-gold-500 hover:bg-gold-600 text-white px-5 rounded-full font-semibold flex items-center gap-2 transition-colors"
          >
            <CheckIcon className="w-5 h-5" />
            Listo
          </button>
        </div>
      )}

      <h2 className="font-heading text-xl font-semibold text-sand-900 mb-3">
        Tus recordatorios de hoy
      </h2>
      {recordatorios.length === 0 ? (
        <p className="text-sand-700 text-lg">No tienes recordatorios activos todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recordatorios.map((r) => (
            <RecordatorioItem key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
