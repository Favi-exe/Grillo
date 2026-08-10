"use client";

import { useEffect, useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { TrashIcon } from "@/components/icons";
import type { AbueloDispositivo } from "@/lib/types";

function fechaLegible(iso?: string | null): string {
  if (!iso) return "Nunca usado";
  return new Date(iso).toLocaleDateString("es-419", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DispositivosVinculados() {
  const [dispositivos, setDispositivos] = useState<AbueloDispositivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  async function cargar() {
    try {
      const res = await fetchFamiliar("/api/dispositivos");
      if (!res.ok) return;
      const data = await res.json();
      setDispositivos(data.dispositivos ?? []);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function revocar(id: string) {
    setBorrandoId(id);
    try {
      const res = await fetchFamiliar(`/api/dispositivos/${id}`, { method: "DELETE" });
      if (res.ok) setDispositivos((prev) => prev.filter((d) => d.id !== id));
    } finally {
      setBorrandoId(null);
    }
  }

  if (cargando || dispositivos.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5">
      <h2 className="font-heading text-lg font-semibold text-sand-900 mb-1">
        Dispositivos vinculados
      </h2>
      <p className="text-base text-sand-700 mb-4">
        Cada uno de estos entra directo, sin pedir login. Si se pierde o cambia de dueño una
        tablet, revoca el acceso desde aquí.
      </p>
      <ul className="flex flex-col gap-2">
        {dispositivos.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-3 bg-sand-100 rounded-2xl px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sand-900 font-medium truncate">
                {d.nombre_dispositivo || "Dispositivo sin nombre"}
              </p>
              <p className="text-sand-600 text-sm">Último uso: {fechaLegible(d.ultimo_acceso)}</p>
            </div>
            <button
              onClick={() => revocar(d.id)}
              disabled={borrandoId === d.id}
              aria-label="Revocar acceso de este dispositivo"
              className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-clay-600 hover:bg-clay-100 disabled:opacity-50 transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
