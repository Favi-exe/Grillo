"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { iniciarSesionFamiliar, isSupabaseAuthConfigured, haySesionActiva } from "@/lib/auth/familiarSession";
import { obtenerTokenDispositivo } from "@/lib/auth/deviceToken";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { CricketMark } from "@/components/icons";
import { PasswordInput } from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"familiar" | "abuelo">("familiar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarLoginMayor, setMostrarLoginMayor] = useState(false);
  // Dispositivo vinculado por un familiar, O sesión propia (persona mayor
  // que se registró sola en /registro-mayor) — cualquiera de las dos alcanza.
  const [accesoListo, setAccesoListo] = useState<boolean | null>(null);

  useEffect(() => {
    async function chequearAcceso() {
      if (obtenerTokenDispositivo()) {
        setAccesoListo(true);
        return;
      }
      setAccesoListo(await haySesionActiva());
    }
    chequearAcceso();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await iniciarSesionFamiliar(email, password);
      // Si esta cuenta es de una persona mayor que se registró sola (rol
      // "abuelo"), la mandamos a su pantalla de conversación, no al panel
      // administrativo de familia.
      const res = await fetchFamiliar("/api/perfil");
      const data = await res.json();
      router.push(data.usuario?.rol === "abuelo" ? "/abuelo" : "/familia");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar sesión.");
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

      <div className="opacity-0 animate-fade-rise stagger-1 flex gap-2 bg-white rounded-full p-1 shadow-warm-sm">
        <button
          onClick={() => setModo("familiar")}
          className={`px-5 py-2.5 rounded-full font-semibold whitespace-nowrap transition-colors ${
            modo === "familiar" ? "bg-ember-600 text-white" : "text-sand-700"
          }`}
        >
          Soy familiar
        </button>
        <button
          onClick={() => setModo("abuelo")}
          className={`px-5 py-2.5 rounded-full font-semibold whitespace-nowrap transition-colors ${
            modo === "abuelo" ? "bg-dusk-700 text-white" : "text-sand-700"
          }`}
        >
          Soy la persona mayor
        </button>
      </div>

      {modo === "familiar" && (
        <div className="opacity-0 animate-fade-rise stagger-2 w-full max-w-sm bg-white rounded-3xl p-6 shadow-warm-sm flex flex-col gap-3">
          {!isSupabaseAuthConfigured() ? (
            <p className="text-sand-700 text-center">
              El login todavía no está disponible: falta conectar Supabase en este servidor.
            </p>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <h1 className="font-heading text-2xl font-semibold text-sand-900 mb-1">Ingresar</h1>
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
                placeholder="Contraseña"
                value={password}
                onChange={setPassword}
              />
              {error && <p className="text-clay-600">{error}</p>}
              <button
                type="submit"
                disabled={cargando}
                className="min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white rounded-2xl font-semibold disabled:opacity-60 transition-colors"
              >
                {cargando ? "Ingresando..." : "Ingresar"}
              </button>
              <p className="text-center text-sand-700">
                ¿No tienes cuenta?{" "}
                <Link href="/registro" className="text-ember-700 font-semibold underline">
                  Regístrate
                </Link>
              </p>
              <Link href="/recuperar-cuenta" className="text-center text-sand-500 text-sm underline">
                Olvidé mi contraseña
              </Link>
            </form>
          )}
        </div>
      )}

      {modo === "abuelo" && (
        <div className="opacity-0 animate-fade-rise stagger-2 w-full max-w-sm bg-white rounded-3xl p-6 shadow-warm-sm text-center">
          {accesoListo === null ? null : accesoListo ? (
            <>
              <p className="text-sand-800 text-lg mb-4">Este dispositivo ya está configurado.</p>
              <button
                onClick={() => router.push("/abuelo")}
                className="min-h-[52px] w-full bg-dusk-700 hover:bg-dusk-800 text-white rounded-2xl font-semibold transition-colors"
              >
                Entrar
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-5">
              {!mostrarLoginMayor ? (
                <div>
                  <p className="text-sand-900 text-xl font-semibold mb-1">
                    ¿Te gustaría la compañía y ayuda de Griyo?
                  </p>
                  <p className="text-sand-700 mb-4">
                    Crea tu cuenta en unos pasos sencillos — yo mismo te voy guiando.
                  </p>
                  <Link
                    href="/registro-mayor"
                    className="inline-flex items-center justify-center min-h-[52px] w-full bg-ember-600 hover:bg-ember-700 text-white text-lg rounded-2xl font-semibold transition-colors"
                  >
                    Crear mi cuenta
                  </Link>
                  <button
                    onClick={() => setMostrarLoginMayor(true)}
                    className="mt-3 text-dusk-700 font-semibold underline"
                  >
                    Ya tengo una cuenta, iniciar sesión
                  </button>
                </div>
              ) : (
                <div>
                  <h1 className="font-heading text-2xl font-semibold text-sand-900 mb-3">
                    Ingresar
                  </h1>
                  <form onSubmit={handleLogin} className="flex flex-col gap-3 text-left">
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
                      placeholder="Contraseña"
                      value={password}
                      onChange={setPassword}
                    />
                    {error && <p className="text-clay-600">{error}</p>}
                    <button
                      type="submit"
                      disabled={cargando}
                      className="min-h-[52px] bg-dusk-700 hover:bg-dusk-800 text-white rounded-2xl font-semibold disabled:opacity-60 transition-colors"
                    >
                      {cargando ? "Ingresando..." : "Ingresar"}
                    </button>
                  </form>
                  <button
                    onClick={() => setMostrarLoginMayor(false)}
                    className="mt-3 text-sand-500 text-sm underline"
                  >
                    Todavía no tengo cuenta, quiero crear una
                  </button>
                </div>
              )}
              <div className="border-t border-sand-200 pt-4">
                <p className="text-sand-600 text-sm">
                  Si un familiar ya te configuró este dispositivo, pídele que toque{" "}
                  <span className="font-semibold">Vincular este dispositivo</span> desde su
                  cuenta.
                </p>
                <Link
                  href="/recuperar-cuenta"
                  className="block text-center text-sand-500 text-sm underline mt-3"
                >
                  Ya tenía una cuenta, perdí el acceso
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
