"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerSesion, cerrarSesion, type Sesion } from "@/lib/session";
import VoiceChat from "@/components/VoiceChat";
import RecordatoriosPanel from "@/components/RecordatoriosPanel";
import BotonEmergencia from "@/components/BotonEmergencia";
import { LogOutIcon } from "@/components/icons";

function fechaLegible(): string {
  const texto = new Date().toLocaleDateString("es-419", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function AbueloPage() {
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
      <div className="max-w-2xl mx-auto flex items-center justify-between mb-6 opacity-0 animate-fade-rise">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-sand-900">
            Hola, {sesion.abueloNombre} 👋
          </h1>
          <p className="text-sand-700 text-lg">{fechaLegible()}</p>
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

      <div className="opacity-0 animate-fade-rise stagger-1">
        <BotonEmergencia abueloId={sesion.abueloId} />
      </div>

      <div className="opacity-0 animate-fade-rise stagger-2">
        <VoiceChat abueloId={sesion.abueloId} usuarioId={sesion.usuarioId} />
      </div>
      <div className="opacity-0 animate-fade-rise stagger-3">
        <RecordatoriosPanel abueloId={sesion.abueloId} />
      </div>
    </main>
  );
}
