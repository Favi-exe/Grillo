"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { cerrarSesionFamiliar, haySesionActiva, suscribirseACambiosDeSesion } from "@/lib/auth/familiarSession";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { guardarTokenDispositivo } from "@/lib/auth/deviceToken";
import MemoriasList from "@/components/MemoriasList";
import PreguntaMemoria from "@/components/PreguntaMemoria";
import AlertasFamiliar from "@/components/AlertasFamiliar";
import EstadoCarlos from "@/components/EstadoCarlos";
import VincularDispositivo from "@/components/VincularDispositivo";
import OnboardingPerfil from "@/components/OnboardingPerfil";
import OnboardingAbuelo from "@/components/OnboardingAbuelo";
import { LogOutIcon } from "@/components/icons";
import type { Abuelo, Usuario } from "@/lib/types";

const RecordatoriosFamiliar = dynamic(() => import("@/components/RecordatoriosFamiliar"), {
  loading: () => (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5 h-40 animate-pulse" aria-hidden="true" />
  ),
});

type Estado = "cargando" | "sin_sesion" | "onboarding_perfil" | "onboarding_abuelo" | "listo";

export default function FamiliaPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [abuelo, setAbuelo] = useState<Abuelo | null>(null);

  const cargarPerfil = useCallback(async () => {
    const activa = await haySesionActiva();
    if (!activa) {
      setEstado("sin_sesion");
      return;
    }
    const res = await fetchFamiliar("/api/perfil");
    if (!res.ok) {
      setEstado("sin_sesion");
      return;
    }
    const data = await res.json();
    setUsuario(data.usuario);
    setAbuelo(data.abuelo);
    if (!data.usuario) setEstado("onboarding_perfil");
    else if (!data.abuelo) setEstado("onboarding_abuelo");
    else setEstado("listo");
  }, []);

  useEffect(() => {
    cargarPerfil();
    const desuscribir = suscribirseACambiosDeSesion((activa) => {
      if (!activa) router.push("/login");
    });
    return desuscribir;
  }, [cargarPerfil, router]);

  useEffect(() => {
    if (estado === "sin_sesion") router.push("/login");
  }, [estado, router]);

  if (estado === "cargando" || estado === "sin_sesion") return null;

  if (estado === "onboarding_perfil") {
    return <OnboardingPerfil onListo={cargarPerfil} />;
  }

  if (estado === "onboarding_abuelo") {
    return <OnboardingAbuelo onListo={cargarPerfil} />;
  }

  return (
    <main className="min-h-screen bg-sand-200 px-4 py-8">
      <div className="max-w-3xl mx-auto flex items-center justify-between mb-6 opacity-0 animate-fade-rise">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-sand-900">
            Vista familiar — {abuelo?.nombre}
          </h1>
          <p className="text-sand-700 text-lg mb-1">
            Hola {usuario?.nombre}, aquí está lo que Grillo fue guardando
          </p>
          <EstadoCarlos nombre={abuelo?.nombre ?? ""} />
        </div>
        <button
          onClick={async () => {
            await cerrarSesionFamiliar();
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
          <AlertasFamiliar />
        </div>
        <div className="opacity-0 animate-fade-rise stagger-1">
          <VincularDispositivo
            nombrePersonaMayor={abuelo?.nombre}
            onVinculado={(token) => {
              guardarTokenDispositivo(token);
            }}
          />
        </div>
        <div className="opacity-0 animate-fade-rise stagger-2">
          <PreguntaMemoria abueloNombre={abuelo?.nombre ?? ""} />
        </div>
        <div className="opacity-0 animate-fade-rise stagger-3">
          <MemoriasList />
        </div>
        <RecordatoriosFamiliar />
      </div>
    </main>
  );
}
