"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { obtenerSesion, cerrarSesion, type Sesion } from "@/lib/session";
import MemoriasList from "@/components/MemoriasList";
import PreguntaMemoria from "@/components/PreguntaMemoria";
import AlertasFamiliar from "@/components/AlertasFamiliar";
import EstadoCarlos from "@/components/EstadoCarlos";
import { LogOutIcon } from "@/components/icons";

// Debajo del pliegue y con su propio estado de formulario: se separa del
// bundle inicial de /familia y se carga cuando el navegador llega a esa
// sección, en vez de sumar su peso al primer render.
const RecordatoriosFamiliar = dynamic(() => import("@/components/RecordatoriosFamiliar"), {
  loading: () => (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5 h-40 animate-pulse" aria-hidden="true" />
  ),
});

export default function FamiliaPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(null);

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      router.push("/login");
      return;
    }
    setSesion(s);
  }, [router]);

  if (!sesion) return null;

  return (
    <main className="min-h-screen bg-sand-200 px-4 py-8">
      <div className="max-w-3xl mx-auto flex items-center justify-between mb-6 opacity-0 animate-fade-rise">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-sand-900">
            Vista familiar — {sesion.abueloNombre}
          </h1>
          <p className="text-sand-700 text-lg mb-1">
            Hola {sesion.nombre}, aquí está lo que Grillo fue guardando
          </p>
          <EstadoCarlos abueloId={sesion.abueloId} nombre={sesion.abueloNombre} />
        </div>
        <button
          onClick={() => {
            cerrarSesion();
            router.push("/login");
          }}
          className="min-h-[48px] min-w-[48px] flex items-center gap-1.5 px-3 rounded-full text-sand-800 hover:bg-sand-300 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
        >
          <LogOutIcon className="w-5 h-5" />
          <span className="text-base">Salir</span>
        </button>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="opacity-0 animate-fade-rise stagger-1">
          <AlertasFamiliar abueloId={sesion.abueloId} />
        </div>
        <div className="opacity-0 animate-fade-rise stagger-2">
          <PreguntaMemoria abueloId={sesion.abueloId} />
        </div>
        <div className="opacity-0 animate-fade-rise stagger-3">
          <MemoriasList abueloId={sesion.abueloId} />
        </div>
        <RecordatoriosFamiliar abueloId={sesion.abueloId} usuarioId={sesion.usuarioId} />
      </div>
    </main>
  );
}
