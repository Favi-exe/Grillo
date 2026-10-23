"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { cerrarSesionFamiliar } from "@/lib/auth/familiarSession";
import { TrashIcon } from "@/components/icons";

/**
 * Derechos sobre los datos desde la vista familiar: descargar todo lo que
 * Griyo guarda de la persona mayor y borrarlo (con confirmación escrita).
 */
export default function ControlDatos({ nombrePersona }: { nombrePersona: string }) {
  const router = useRouter();
  const [descargando, setDescargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [texto, setTexto] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setDescargando(true);
    setError(null);
    try {
      const res = await fetchFamiliar("/api/mis-datos");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No pudimos preparar los datos");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Datos de ${nombrePersona} en Griyo.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos preparar los datos");
    } finally {
      setDescargando(false);
    }
  }

  async function borrar() {
    setBorrando(true);
    setError(null);
    try {
      const res = await fetchFamiliar("/api/mis-datos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar: texto }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos borrar los datos");
      await cerrarSesionFamiliar().catch(() => {});
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos borrar los datos");
      setBorrando(false);
    }
  }

  const coincide = texto.trim().toLowerCase() === nombrePersona.trim().toLowerCase();

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5">
      <h2 className="font-heading text-lg font-semibold text-sand-900 mb-1">Datos y privacidad</h2>
      <p className="text-base text-sand-700 mb-4">
        Puedes llevarte todo lo que Griyo guarda de {nombrePersona} o pedir que se borre. El archivo no incluye el texto de las
        charlas.
      </p>

      <button
        onClick={descargar}
        disabled={descargando}
        className="min-h-[48px] w-full bg-sand-200 hover:bg-sand-300 text-sand-900 rounded-2xl font-semibold disabled:opacity-60 transition-colors"
      >
        {descargando ? "Preparando..." : `Descargar los datos de ${nombrePersona}`}
      </button>

      {!confirmando ? (
        <button
          onClick={() => setConfirmando(true)}
          className="mt-2 min-h-[48px] w-full flex items-center justify-center gap-2 text-clay-600 hover:bg-clay-400/10 rounded-2xl font-semibold transition-colors"
        >
          <TrashIcon className="w-5 h-5" />
          Borrar todos sus datos
        </button>
      ) : (
        <div className="mt-3 border-2 border-clay-400/50 rounded-2xl p-4">
          <p className="text-sand-900 font-semibold mb-1">Esto no se puede deshacer</p>
          <p className="text-sand-800 mb-3">
            Se borran sus historias, charlas, fotos, ánimo, recordatorios y dispositivos, y también tu cuenta. Las otras
            personas de la familia mantienen su cuenta, pero dejarán de ver a {nombrePersona}. Para confirmar, escribe su nombre:{" "}
            <span className="font-semibold">{nombrePersona}</span>
          </p>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Nombre de la persona mayor para confirmar"
            className="min-h-[48px] w-full border-2 border-sand-400 rounded-2xl px-4 text-base bg-white focus:outline-none focus:ring-4 focus:ring-ember-200"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={borrar}
              disabled={!coincide || borrando}
              className="min-h-[48px] flex-1 bg-clay-500 hover:bg-clay-600 text-white rounded-2xl font-semibold disabled:opacity-40 transition-colors"
            >
              {borrando ? "Borrando..." : "Borrar definitivamente"}
            </button>
            <button
              onClick={() => {
                setConfirmando(false);
                setTexto("");
              }}
              className="min-h-[48px] px-4 text-sand-800 hover:bg-sand-200 rounded-2xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-clay-600 mt-3">
          {error}
        </p>
      )}
      <p className="text-sm text-sand-700 mt-4">
        <Link href="/privacidad" className="underline">Política de privacidad</Link> ·{" "}
        <Link href="/terminos" className="underline">Términos de uso</Link>
      </p>
    </div>
  );
}
