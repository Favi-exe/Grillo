import Link from "next/link";
import { CricketMark } from "@/components/icons";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-6 text-center bg-dusk-soft">
      {/* Resplandor de atardecer, decorativo — no compite con el contenido */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 w-[26rem] h-[26rem] rounded-full bg-dawn/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 w-[22rem] h-[22rem] rounded-full bg-dusk-400/30 blur-3xl"
      />

      <div className="relative flex flex-col items-center">
        <div
          className="w-24 h-24 rounded-4xl bg-white shadow-warm-lg flex items-center justify-center mb-6 opacity-0 animate-fade-rise"
          style={{ animationDelay: "0ms" }}
        >
          <CricketMark className="w-12 h-12 text-ember-600" />
        </div>

        <h1
          className="font-heading text-5xl font-semibold text-dusk-800 mb-3 opacity-0 animate-fade-rise stagger-1"
        >
          Griyo
        </h1>

        <p
          className="text-xl text-sand-800 max-w-md mb-10 leading-relaxed opacity-0 animate-fade-rise stagger-2"
        >
          Tu compañía de cada día. Griyo conversa, acompaña y guarda con
          cariño las historias de tu vida para que tu familia las pueda
          atesorar.
        </p>

        <Link
          href="/login"
          className="opacity-0 animate-fade-rise stagger-3 inline-flex items-center justify-center min-h-[56px] bg-ember-600 hover:bg-ember-700 active:scale-[0.98] text-white text-xl font-semibold px-10 py-4 rounded-full shadow-warm transition-[background-color,transform] focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
        >
          Ingresar
        </Link>
      </div>
    </main>
  );
}
