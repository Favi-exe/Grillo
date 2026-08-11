"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { iniciarSesion, isSupabaseAuthConfigured } from "@/lib/auth/familiarSession";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { CricketMark, CheckIcon } from "@/components/icons";

type Paso = "intro" | "nombre" | "email" | "confirmar" | "listo";

const NARRACION: Record<Paso, string> = {
  intro:
    "Hola. Soy Griyo. Vamos a crear tu cuenta juntos. Son solo unos pasos sencillos, yo te voy guiando en cada uno.",
  nombre: "Primero, dime cómo te llamas.",
  email: "Ahora necesito tu correo electrónico, para guardar tu cuenta de forma segura.",
  confirmar: "Perfecto. Cuando quieras, creamos tu cuenta.",
  listo: "Listo. Tu cuenta ya está creada. Ya puedes empezar a hablar conmigo.",
};

export default function RegistroMayorPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("intro");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordGenerada, setPasswordGenerada] = useState<string | null>(null);

  const { disponible: ttsDisponible, hablar } = useSpeechSynthesis("es-419");

  useEffect(() => {
    if (ttsDisponible) hablar(NARRACION[paso]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso]);

  async function crearCuenta() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/registro-mayor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pudimos crear la cuenta");

      // Establece la sesión en ESTE navegador — de acá en más queda
      // guardada, nunca más va a pedir iniciar sesión en este dispositivo.
      await iniciarSesion(data.email, data.password);
      setPasswordGenerada(data.password);
      setPaso("listo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear la cuenta");
    } finally {
      setCargando(false);
    }
  }

  const inputCls =
    "min-h-[64px] w-full border-2 border-sand-400 rounded-3xl px-6 text-2xl bg-white focus:outline-none focus:ring-4 focus:ring-ember-200 focus:border-ember-400";
  const botonCls =
    "min-h-[64px] w-full bg-ember-600 hover:bg-ember-700 text-white text-xl rounded-3xl font-semibold disabled:opacity-60 transition-colors";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 bg-dusk-soft">
      <div className="w-20 h-20 rounded-4xl bg-white shadow-warm-lg flex items-center justify-center animate-pop-in">
        <CricketMark className="w-10 h-10 text-ember-600" />
      </div>

      <div className="w-full max-w-md bg-white rounded-4xl p-7 shadow-warm-lg animate-pop-in">
        {paso === "intro" && (
          <div className="flex flex-col gap-5 text-center">
            <h1 className="font-heading text-3xl font-semibold text-sand-900">
              ¡Hola! Soy Griyo 🦗
            </h1>
            <p className="text-xl text-sand-800 leading-relaxed">
              Vamos a crear tu cuenta juntos. Son solo unos pasos sencillos, yo te voy guiando en
              cada uno.
            </p>
            {!isSupabaseAuthConfigured() ? (
              <p className="text-clay-600 text-lg">
                Todavía no puedo crear cuentas: falta conectar Supabase en este servidor.
              </p>
            ) : (
              <button onClick={() => setPaso("nombre")} className={botonCls}>
                Empezar
              </button>
            )}
          </div>
        )}

        {paso === "nombre" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (nombre.trim()) setPaso("email");
            }}
            className="flex flex-col gap-5"
          >
            <h1 className="font-heading text-2xl font-semibold text-sand-900 text-center">
              ¿Cómo te llamas?
            </h1>
            <input
              autoFocus
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className={inputCls}
            />
            <button type="submit" disabled={!nombre.trim()} className={botonCls}>
              Continuar
            </button>
          </form>
        )}

        {paso === "email" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setPaso("confirmar");
            }}
            className="flex flex-col gap-5"
          >
            <h1 className="font-heading text-2xl font-semibold text-sand-900 text-center">
              Ahora tu correo electrónico
            </h1>
            <p className="text-lg text-sand-700 text-center">
              Es para guardar tu cuenta de forma segura. Si no estás seguro/a, pídele una mano a
              un familiar.
            </p>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className={inputCls}
            />
            <button type="submit" disabled={!email.trim()} className={botonCls}>
              Continuar
            </button>
          </form>
        )}

        {paso === "confirmar" && (
          <div className="flex flex-col gap-5 text-center">
            <h1 className="font-heading text-2xl font-semibold text-sand-900">
              Perfecto, {nombre}
            </h1>
            <p className="text-xl text-sand-800 leading-relaxed">
              Voy a crear tu cuenta con el correo <span className="font-semibold">{email}</span>.
            </p>
            {error && <p className="text-clay-600 text-lg">{error}</p>}
            <button onClick={crearCuenta} disabled={cargando} className={botonCls}>
              {cargando ? "Creando tu cuenta..." : "Crear mi cuenta"}
            </button>
            <button
              onClick={() => setPaso("email")}
              disabled={cargando}
              className="text-sand-600 underline text-lg"
            >
              Corregir el correo
            </button>
          </div>
        )}

        {paso === "listo" && (
          <div className="flex flex-col gap-5 text-center animate-pop-in">
            <span className="mx-auto w-14 h-14 rounded-2xl bg-ember-100 text-ember-700 flex items-center justify-center">
              <CheckIcon className="w-7 h-7" />
            </span>
            <h1 className="font-heading text-2xl font-semibold text-sand-900">
              ¡Listo, {nombre}!
            </h1>
            <p className="text-xl text-sand-800 leading-relaxed">
              Tu cuenta ya está creada. Este dispositivo va a recordar quién eres — no te voy a
              volver a pedir que inicies sesión.
            </p>
            {passwordGenerada && (
              <div className="bg-sand-100 rounded-2xl p-4">
                <p className="text-base text-sand-700 mb-1">
                  Por las dudas, tu contraseña es:
                </p>
                <p className="text-2xl font-semibold text-sand-900 tabular-nums">
                  {passwordGenerada}
                </p>
                <p className="text-sm text-sand-600 mt-1">
                  Guárdala en un papel o cuéntale a un familiar, por si algún día hace falta.
                </p>
              </div>
            )}
            <button onClick={() => router.push("/abuelo")} className={botonCls}>
              Empezar a hablar con Griyo
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
