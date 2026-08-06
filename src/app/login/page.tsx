"use client";

import { useRouter } from "next/navigation";
import { guardarSesion } from "@/lib/session";
import { CricketMark, PeopleIcon } from "@/components/icons";

const ABUELO_ID = "abuelo-demo-1";
const ABUELO_NOMBRE = "Carlos";

export default function LoginPage() {
  const router = useRouter();

  function entrarComoAbuelo() {
    guardarSesion({
      usuarioId: "abuelo-user-1",
      nombre: "Don Carlos",
      rol: "abuelo",
      abueloId: ABUELO_ID,
      abueloNombre: ABUELO_NOMBRE,
    });
    router.push("/abuelo");
  }

  function entrarComoFamiliar() {
    guardarSesion({
      usuarioId: "familiar-demo-1",
      nombre: "Ana",
      rol: "familiar",
      abueloId: ABUELO_ID,
      abueloNombre: ABUELO_NOMBRE,
    });
    router.push("/familia");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 bg-sand-200">
      <div
        className="w-16 h-16 rounded-3xl bg-white shadow-warm-sm flex items-center justify-center mb-2 opacity-0 animate-fade-rise"
      >
        <CricketMark className="w-8 h-8 text-ember-600" />
      </div>

      <h1 className="font-heading text-3xl font-semibold text-sand-900 mb-2 opacity-0 animate-fade-rise stagger-1">
        ¿Quién eres?
      </h1>

      <button
        onClick={entrarComoAbuelo}
        className="opacity-0 animate-fade-rise stagger-2 w-full max-w-sm bg-white hover:bg-ember-50 border-2 border-sand-400 hover:border-ember-400 rounded-3xl p-6 text-left shadow-warm-sm hover:shadow-warm transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl" aria-hidden="true">
            👴
          </span>
          <div>
            <div className="text-xl font-semibold text-sand-900">Soy Carlos</div>
            <div className="text-sand-700">Quiero charlar con Grillo</div>
          </div>
        </div>
      </button>

      <button
        onClick={entrarComoFamiliar}
        className="opacity-0 animate-fade-rise stagger-3 w-full max-w-sm bg-white hover:bg-dusk-50 border-2 border-sand-400 hover:border-dusk-400 rounded-3xl p-6 text-left shadow-warm-sm hover:shadow-warm transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-dusk-300"
      >
        <div className="flex items-center gap-4">
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-dusk-100 flex items-center justify-center">
            <PeopleIcon className="w-6 h-6 text-dusk-700" />
          </span>
          <div>
            <div className="text-xl font-semibold text-sand-900">Soy Ana (familiar)</div>
            <div className="text-sand-700">Quiero ver las historias e info de Carlos</div>
          </div>
        </div>
      </button>

      <p className="text-base text-sand-700 mt-6 max-w-sm text-center opacity-0 animate-fade-rise stagger-4">
        Login simplificado para la demo — en producción cada familia tendría su propia cuenta.
      </p>
    </main>
  );
}
