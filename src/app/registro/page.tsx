"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registrarConTelefono, isSupabaseAuthConfigured } from "@/lib/auth/familiarSession";
import { esEmailValido, normalizarTelefono } from "@/lib/auth/telefono";
import { PasswordInput } from "@/components/PasswordInput";
import CasillaConsentimiento from "@/components/CasillaConsentimiento";
import GriyoMascota from "@/components/ilustraciones/GriyoMascota";

export default function RegistroPage() {
  const router = useRouter();
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acepto) {
      setError("Para crear la cuenta hace falta aceptar los términos y la política de privacidad.");
      return;
    }
    if (!normalizarTelefono(telefono)) {
      setError("Escribe un número de WhatsApp válido, por ejemplo +56 9 1234 5678.");
      return;
    }
    if (email.trim() && !esEmailValido(email)) {
      setError("Ese correo no parece válido. Puedes dejarlo en blanco, es opcional.");
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
      await registrarConTelefono({
        telefono,
        password,
        email: email.trim() || undefined,
      });
      router.push("/familia");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear la cuenta.");
      setCargando(false);
    }
  }

  const inputCls =
    "min-h-[52px] w-full border-2 border-sand-400 rounded-2xl px-4 text-lg bg-white focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-8 gap-6 bg-sand-200">
      <GriyoMascota estado="idle" className="w-24 h-24 -mb-3 opacity-0 animate-fade-rise" />

      <div className="opacity-0 animate-fade-rise stagger-1 w-full max-w-sm bg-white rounded-3xl p-6 shadow-warm-sm">
        {!isSupabaseAuthConfigured() ? (
          <p className="text-sand-700 text-center">
            El registro todavía no está disponible: falta conectar Supabase en este servidor.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <h1 className="font-heading text-2xl font-semibold text-sand-900 mb-1">
              Crea tu cuenta
            </h1>
            <label className="flex flex-col gap-1">
              <span className="text-sand-800 font-semibold">Tu número de WhatsApp</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="+56 9 1234 5678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={inputCls}
              />
              <span className="text-sm text-sand-600">
                Con él entras a tu cuenta, y por ahí te avisamos si algo importante pasa.
              </span>
            </label>
            <PasswordInput
              required
              placeholder="Contraseña (mínimo 6 caracteres)"
              value={password}
              onChange={setPassword}
            />
            <PasswordInput
              required
              placeholder="Repetir contraseña"
              value={confirmar}
              onChange={setConfirmar}
            />
            <label className="flex flex-col gap-1">
              <span className="text-sand-800 font-semibold">
                Correo electrónico <span className="font-normal text-sand-600">(opcional)</span>
              </span>
              <input
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </label>
            <CasillaConsentimiento checked={acepto} onChange={setAcepto} />
            {error && <p className="text-clay-600">{error}</p>}
            <button
              type="submit"
              disabled={cargando}
              className="min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white rounded-2xl font-semibold disabled:opacity-60 transition-colors"
            >
              {cargando ? "Creando cuenta..." : "Crear cuenta"}
            </button>
            <p className="text-center text-sand-700">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-ember-700 font-semibold underline">
                Ingresa
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
