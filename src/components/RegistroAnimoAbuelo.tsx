"use client";

import { useEffect, useState } from "react";
import { fetchAbuelo } from "@/lib/auth/fetchConAuth";
import { NIVELES_ANIMO } from "@/lib/emociones";
import { CaraMuyBajaIcon, CaraBajaIcon, CaraNeutralIcon, CaraBuenaIcon, CaraAltaIcon, CheckIcon } from "@/components/icons";

const ICONOS = [CaraMuyBajaIcon, CaraBajaIcon, CaraNeutralIcon, CaraBuenaIcon, CaraAltaIcon];

export default function RegistroAnimoAbuelo({ nombre }: { nombre: string }) {
  const [yaRegistrado, setYaRegistrado] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetchAbuelo("/api/registros-animo")
      .then((res) => res.json())
      .then((data) => setYaRegistrado(data.registroDeHoy?.valencia ?? null))
      .catch((err) => console.error("[RegistroAnimoAbuelo]", err))
      .finally(() => setCargando(false));
  }, []);

  async function registrar(valencia: number) {
    if (enviando) return;
    setEnviando(true);
    setYaRegistrado(valencia); // optimista — se ve al toque, no hay nada que perder si falla
    try {
      await fetchAbuelo("/api/registros-animo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valencia }),
      });
    } catch (err) {
      console.error("[RegistroAnimoAbuelo]", err);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return null;

  if (yaRegistrado !== null) {
    const nivel = NIVELES_ANIMO.find((n) => n.valencia === yaRegistrado);
    return (
      <div className="w-full max-w-2xl mx-auto mb-6 bg-white rounded-3xl shadow-warm-sm p-5 flex items-center gap-4 animate-pop-in">
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-ember-100 text-ember-700 flex items-center justify-center">
          <CheckIcon className="w-6 h-6" />
        </span>
        <p className="text-lg text-sand-800">
          Gracias por contarme cómo estás hoy, {nombre}. Dijiste que te sentías{" "}
          <span className={`font-semibold ${nivel?.texto ?? ""}`}>{nivel?.etiqueta.toLowerCase()}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 bg-white rounded-3xl shadow-warm-sm p-5">
      <h2 className="font-heading text-lg font-semibold text-sand-900 mb-3">
        ¿Cómo te sientes hoy, {nombre}?
      </h2>
      <div className="flex justify-between gap-2">
        {NIVELES_ANIMO.map((nivel, i) => {
          const Icono = ICONOS[i];
          return (
            <button
              key={nivel.valencia}
              onClick={() => registrar(nivel.valencia)}
              disabled={enviando}
              className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl hover:bg-sand-100 active:scale-95 transition-[background-color,transform] disabled:opacity-60"
            >
              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${nivel.fondo}`}>
                <Icono className="w-7 h-7" />
              </span>
              <span className="text-sm text-sand-700 font-medium">{nivel.etiqueta}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
