import Link from "next/link";
import type { ReactNode } from "react";
import { CricketMark } from "@/components/icons";
import { FECHA_LEGAL_TEXTO } from "@/lib/legal";

export default function LegalLayout({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-sand-200 px-4 py-8">
      <article className="max-w-2xl mx-auto bg-white rounded-3xl shadow-warm-sm p-6 sm:p-9">
        <Link href="/" className="inline-flex items-center gap-2 text-dusk-700 font-semibold mb-6">
          <CricketMark className="w-7 h-7 text-ember-600" />
          Griyo
        </Link>
        <h1 className="font-heading text-3xl font-semibold text-sand-900 mb-1">{titulo}</h1>
        <p className="text-sand-700 mb-6">Última actualización: {FECHA_LEGAL_TEXTO}</p>
        <div className="text-sand-900 leading-relaxed [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-7 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_li]:mb-1.5 [&_a]:text-ember-700 [&_a]:underline">
          {children}
        </div>
        <nav className="mt-8 pt-5 border-t border-sand-300 flex flex-wrap gap-x-5 gap-y-2 text-sand-700">
          <Link href="/privacidad" className="underline">Política de privacidad</Link>
          <Link href="/terminos" className="underline">Términos de uso</Link>
          <Link href="/" className="underline">Volver al inicio</Link>
        </nav>
      </article>
    </main>
  );
}
