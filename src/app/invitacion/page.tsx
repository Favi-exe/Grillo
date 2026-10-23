"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  suscribirseACambiosDeSesion,
  actualizarContrasena,
  obtenerMetadataUsuarioActual,
} from "@/lib/auth/familiarSession";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";

import { PasswordInput } from "@/components/PasswordInput";
import CasillaConsentimiento from "@/components/CasillaConsentimiento";
import GriyoMascota from "@/components/ilustraciones/GriyoMascota";

export default function InvitacionPage() {
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [abueloNombre, setAbueloNombre] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [relacion, setRelacion] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const desuscribir = suscribirseACambiosDeSesion(async (activa) => {
      if (!activa) return;
      const metadata = await obtenerMetadataUsuarioActual();
      setAbueloNombre((metadata?.abuelo_nombre as string) ?? null);
      setRelacion((metadata?.relacion as string) ?? "");
      setListo(true);
    });
    return desuscribir;
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return;
    if (!acepto) {
      setError("Para continuar hace falta aceptar los términos y la política de privacidad.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      await actualizarContrasena(password);
      const res = await fetchFamiliar("/api/invitaciones/aceptar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, relacionConAbuelo: relacion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pudimos completar el alta.");
      router.push("/familia");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos completar el alta.");
    } finally {
      setCargando(false);
    }
  }

  const inputCls =
    "min-h-[52px] w-full border-2 border-sand-400 rounded-2xl px-4 text-lg bg-white focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 bg-sand-200">
      <GriyoMascota estado="idle" className="w-24 h-24 -mb-3 opacity-0 animate-fade-rise" />

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-warm-sm">
        {!listo ? (
          <p className="text-sand-700 text-center">Verificando la invitación...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <h1 className="font-heading text-2xl font-semibold text-sand-900 mb-1">
              {abueloNombre
                ? `Te invitaron a acompañar a ${abueloNombre}`
                : "Te invitaron a Griyo"}
            </h1>
            <p className="text-sand-700 mb-2">
              Completa estos datos para terminar de crear tu cuenta.
            </p>
            <input
              type="text"
              required
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="Relación (ej. hija, nieto)"
              value={relacion}
              onChange={(e) => setRelacion(e.target.value)}
              className={inputCls}
            />
            <PasswordInput
              required
              placeholder="Elige una contraseña"
              value={password}
              onChange={setPassword}
            />
            <PasswordInput
              required
              placeholder="Repetir contraseña"
              value={confirmar}
              onChange={setConfirmar}
            />
            <CasillaConsentimiento checked={acepto} onChange={setAcepto} />
            {error && <p className="text-clay-600">{error}</p>}
            <button
              type="submit"
              disabled={cargando}
              className="min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white rounded-2xl font-semibold disabled:opacity-60 transition-colors"
            >
              {cargando ? "Creando tu cuenta..." : "Aceptar invitación"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
