"use client";

import { useState } from "react";
import Link from "next/link";
import { solicitarRecuperacion, isSupabaseAuthConfigured } from "@/lib/auth/familiarSession";
import { CricketMark, CheckIcon } from "@/components/icons";

export default function RecuperarCuentaPage() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await solicitarRecuperacion(email);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar el correo.");
    } finally {
      setCargando(false);
    }
  }

  const inputCls =
    "min-h-[52px] w-full border-2 border-sand-400 rounded-2xl px-4 text-lg bg-white focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 bg-sand-200">
      <div className="w-16 h-16 rounded-3xl bg-white shadow-warm-sm flex items-center justify-center">
        <CricketMark className="w-8 h-8 text-ember-600" />
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-warm-sm">
        {!isSupabaseAuthConfigured() ? (
          <p className="text-sand-700 text-center">
            Esto necesita Supabase conectado en este servidor.
          </p>
        ) : enviado ? (
          <div className="text-center flex flex-col items-center gap-3 animate-pop-in">
            <span className="w-14 h-14 rounded-2xl bg-ember-100 text-ember-700 flex items-center justify-center">
              <CheckIcon className="w-7 h-7" />
            </span>
            <h1 className="font-heading text-2xl font-semibold text-sand-900">Revisa tu correo</h1>
            <p className="text-sand-700 text-lg">
              Si hay una cuenta con <span className="font-semibold">{email}</span>, te mandamos un
              link para elegir una nueva contraseña. Si la persona mayor no puede hacer este paso
              sola, un familiar puede ayudarla desde su propio correo.
            </p>
            <Link href="/login" className="text-ember-700 font-semibold underline mt-2">
              Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <h1 className="font-heading text-2xl font-semibold text-sand-900 mb-1">
              Recuperar el acceso
            </h1>
            <p className="text-sand-700 mb-2">
              Escribe el correo con el que creaste la cuenta y te mandamos un link para volver a
              entrar.
            </p>
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
            {error && <p className="text-clay-600">{error}</p>}
            <button
              type="submit"
              disabled={cargando}
              className="min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white rounded-2xl font-semibold disabled:opacity-60 transition-colors"
            >
              {cargando ? "Enviando..." : "Enviar link de recuperación"}
            </button>
            <Link href="/login" className="text-center text-sand-700 underline">
              Volver al login
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
