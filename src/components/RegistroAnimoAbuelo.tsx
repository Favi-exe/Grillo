"use client";

import { useEffect, useState } from "react";
import { fetchAbuelo } from "@/lib/auth/fetchConAuth";
import { NIVELES_ANIMO } from "@/lib/emociones";
import { CaraMuyBajaIcon, CaraBajaIcon, CaraNeutralIcon, CaraBuenaIcon, CaraAltaIcon } from "@/components/icons";
import GriyoMascota from "@/components/ilustraciones/GriyoMascota";
import CorazonesSubiendo from "@/components/ilustraciones/Corazones";

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
      <div className="relative w-full max-w-2xl mx-auto mb-6 bg-white rounded-3xl shadow-warm-sm p-5 flex items-center gap-4 animate-pop-in">
        <CorazonesSubiendo />
        <GriyoMascota estado="feliz" className="w-16 h-16 shrink-0" />
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
              className="group flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl hover:bg-sand-100 hover:-translate-y-1 active:scale-90 transition-[background-color,transform] disabled:opacity-60"
            >
              <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-warm-sm group-hover:scale-110 group-hover:rotate-3 transition-transform ${nivel.fondo}`}>
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
