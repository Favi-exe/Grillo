"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarContrasena, suscribirseACambiosDeSesion } from "@/lib/auth/familiarSession";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { CricketMark } from "@/components/icons";
import { PasswordInput } from "@/components/PasswordInput";

export default function RestablecerContrasenaPage() {
  const router = useRouter();
  const [listoParaCambiar, setListoParaCambiar] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // El link de recuperación deja una sesión temporal apenas carga la
    // página (Supabase la arma sola a partir del token en la URL).
    const desuscribir = suscribirseACambiosDeSesion((activa) => {
      if (activa) setListoParaCambiar(true);
    });
    return desuscribir;
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      // Según quién sea (persona mayor o familiar) va a una pantalla u otra.
      const res = await fetchFamiliar("/api/perfil");
      const data = await res.json();
      router.push(data.usuario?.rol === "abuelo" ? "/abuelo" : "/familia");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar la contraseña.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 bg-sand-200">
      <div className="w-16 h-16 rounded-3xl bg-white shadow-warm-sm flex items-center justify-center">
        <CricketMark className="w-8 h-8 text-ember-600" />
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-warm-sm">
        {!listoParaCambiar ? (
          <p className="text-sand-700 text-center">Verificando el link...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <h1 className="font-heading text-2xl font-semibold text-sand-900 mb-1">
              Elige una nueva contraseña
            </h1>
            <PasswordInput
              required
              placeholder="Contraseña nueva"
              value={password}
              onChange={setPassword}
            />
            <PasswordInput
              required
              placeholder="Repetir contraseña"
              value={confirmar}
              onChange={setConfirmar}
            />
            {error && <p className="text-clay-600">{error}</p>}
            <button
              type="submit"
              disabled={cargando}
              className="min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white rounded-2xl font-semibold disabled:opacity-60 transition-colors"
            >
              {cargando ? "Guardando..." : "Guardar y entrar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
