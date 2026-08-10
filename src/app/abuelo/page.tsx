"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAbuelo } from "@/lib/auth/fetchConAuth";
import { borrarTokenDispositivo } from "@/lib/auth/deviceToken";
import { cerrarSesionFamiliar } from "@/lib/auth/familiarSession";
import VoiceChat from "@/components/VoiceChat";
import RecordatoriosPanel from "@/components/RecordatoriosPanel";
import BotonEmergencia from "@/components/BotonEmergencia";
import RegistroAnimoAbuelo from "@/components/RegistroAnimoAbuelo";
import PreguntaSemana from "@/components/PreguntaSemana";
import InvitarFamiliar from "@/components/InvitarFamiliar";
import { CricketMark } from "@/components/icons";
import type { Abuelo } from "@/lib/types";

function fechaLegible(): string {
  const texto = new Date().toLocaleDateString("es-419", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

type Estado = "cargando" | "sin_dispositivo" | "listo";

export default function AbueloPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [abuelo, setAbuelo] = useState<Abuelo | null>(null);

  useEffect(() => {
    // fetchAbuelo prueba el token de dispositivo y, si no hay, la sesión
    // propia (persona mayor que se registró sola) — cualquiera alcanza.
    fetchAbuelo("/api/abuelos")
      .then(async (res) => {
        if (!res.ok) {
          setEstado("sin_dispositivo");
          return;
        }
        const data = await res.json();
        setAbuelo(data.abuelo);
        setEstado("listo");
      })
      .catch(() => setEstado("sin_dispositivo"));
  }, []);

  if (estado === "cargando") return null;

  if (estado === "sin_dispositivo") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-4 bg-sand-200 text-center">
        <div className="w-16 h-16 rounded-3xl bg-white shadow-warm-sm flex items-center justify-center">
          <CricketMark className="w-8 h-8 text-ember-600" />
        </div>
        <h1 className="font-heading text-2xl font-semibold text-sand-900">
          Este dispositivo no está configurado
        </h1>
        <p className="text-sand-700 text-lg max-w-sm">
          Pídele a un familiar que entre a su cuenta y toque{" "}
          <span className="font-semibold">&quot;Vincular este dispositivo&quot;</span> desde aquí
          mismo, o crea tu propia cuenta si quieres usar a Grillo por tu cuenta.
        </p>
        <button
          onClick={() => router.push("/registro-mayor")}
          className="min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white px-6 rounded-2xl font-semibold mt-2 transition-colors"
        >
          Crear mi propia cuenta
        </button>
        <button
          onClick={() => router.push("/login")}
          className="text-dusk-700 underline mt-1"
        >
          Ir al login
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sand-200 px-4 py-8">
      <div className="max-w-2xl mx-auto flex items-center justify-between mb-6 opacity-0 animate-fade-rise">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-sand-900">
            Hola, {abuelo?.nombre} 👋
          </h1>
          <p className="text-sand-700 text-lg">{fechaLegible()}</p>
        </div>
        <button
          onClick={async () => {
            borrarTokenDispositivo();
            await cerrarSesionFamiliar();
            router.push("/login");
          }}
          className="text-sand-500 text-sm underline"
        >
          No soy yo
        </button>
      </div>

      <div className="opacity-0 animate-fade-rise stagger-1">
        <BotonEmergencia />
      </div>

      <div className="opacity-0 animate-fade-rise stagger-1">
        <RegistroAnimoAbuelo nombre={abuelo?.nombre ?? ""} />
      </div>

      <div className="opacity-0 animate-fade-rise stagger-1">
        <PreguntaSemana />
      </div>

      <div className="opacity-0 animate-fade-rise stagger-2">
        <VoiceChat />
      </div>
      <div className="opacity-0 animate-fade-rise stagger-3">
        <RecordatoriosPanel />
      </div>
      <div className="max-w-2xl mx-auto mt-6 opacity-0 animate-fade-rise stagger-3">
        <InvitarFamiliar />
      </div>
    </main>
  );
}
