"use client";

import { useState } from "react";
import Link from "next/link";
import { registrarFamiliar, isSupabaseAuthConfigured } from "@/lib/auth/familiarSession";
import { CricketMark, CheckIcon } from "@/components/icons";
import { PasswordInput } from "@/components/PasswordInput";

export default function RegistroPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

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
      await registrarFamiliar(email, password);
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear la cuenta.");
    } finally {
      setCargando(false);
    }
  }

  const inputCls =
    "min-h-[52px] w-full border-2 border-sand-400 rounded-2xl px-4 text-lg bg-white focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 bg-sand-200">
      <div className="w-16 h-16 rounded-3xl bg-white shadow-warm-sm flex items-center justify-center mb-2 opacity-0 animate-fade-rise">
        <CricketMark className="w-8 h-8 text-ember-600" />
      </div>

      <div className="opacity-0 animate-fade-rise stagger-1 w-full max-w-sm bg-white rounded-3xl p-6 shadow-warm-sm">
        {!isSupabaseAuthConfigured() ? (
          <p className="text-sand-700 text-center">
            El registro todavía no está disponible: falta conectar Supabase en este servidor.
          </p>
        ) : listo ? (
          <div className="text-center flex flex-col items-center gap-3 animate-pop-in">
            <span className="w-14 h-14 rounded-2xl bg-ember-100 text-ember-700 flex items-center justify-center">
              <CheckIcon className="w-7 h-7" />
            </span>
            <h1 className="font-heading text-2xl font-semibold text-sand-900">Revisa tu correo</h1>
            <p className="text-sand-700 text-lg">
              Te mandamos un link de confirmación a <span className="font-semibold">{email}</span>.
              Apenas lo confirmes, vuelve a entrar aquí y seguimos con la configuración.
            </p>
            <Link href="/login" className="text-ember-700 font-semibold underline mt-2">
              Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <h1 className="font-heading text-2xl font-semibold text-sand-900 mb-1">
              Crea tu cuenta
            </h1>
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
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
