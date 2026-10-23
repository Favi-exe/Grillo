"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { cerrarSesionFamiliar } from "@/lib/auth/familiarSession";
import { CricketMark } from "@/components/icons";

/**
 * Aviso que bloquea la pantalla hasta que la cuenta acepte la versión vigente
 * de los términos y la política de privacidad. No aparece si la cuenta ya
 * aceptó, si el dispositivo entra con token (sin cuenta propia: ahí acepta
 * quien lo vinculó) o si el servidor todavía no tiene la tabla de
 * consentimientos.
 */
export default function ConsentimientoGate() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const botonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    fetchFamiliar("/api/consentimiento")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (vivo && data.requerido && !data.aceptado) setVisible(true);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    botonRef.current?.focus();
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [visible]);

  async function aceptar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetchFamiliar("/api/consentimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acepto: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar tu respuesta");
      setVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar tu respuesta");
    } finally {
      setEnviando(false);
    }
  }

  async function salir() {
    await cerrarSesionFamiliar();
    router.push("/");
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sand-900/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-consentimiento"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-warm-lg p-6 sm:p-8"
      >
        <div className="w-14 h-14 rounded-3xl bg-sand-200 flex items-center justify-center mb-4">
          <CricketMark className="w-8 h-8 text-ember-600" />
        </div>
        <h2 id="titulo-consentimiento" className="font-heading text-2xl font-semibold text-sand-900 mb-3">
          Antes de seguir
        </h2>
        <p className="text-lg text-sand-800 mb-3">Para usar Griyo necesitamos que conozcas y aceptes cómo cuidamos los datos:</p>
        <ul className="text-lg text-sand-800 list-disc pl-6 grid gap-1.5 mb-4">
          <li>Griyo guarda lo que se conversa en resúmenes de historias, el ánimo y los recordatorios.</li>
          <li>La familia ve esos resúmenes, no el texto de las charlas.</li>
          <li>Parte de esa información puede revelar datos de salud, y la tratamos solo con tu consentimiento.</li>
          <li>Griyo no es un servicio médico ni de urgencia.</li>
        </ul>
        <p className="text-lg text-sand-800 mb-4">
          Puedes leer los{" "}
          <Link href="/terminos" target="_blank" className="text-ember-700 underline font-semibold">
            términos de uso
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="text-ember-700 underline font-semibold">
            política de privacidad
          </Link>{" "}
          completos.
        </p>
        <label className="flex items-start gap-3 bg-sand-100 rounded-2xl p-4 cursor-pointer mb-4">
          <input
            ref={botonRef}
            type="checkbox"
            checked={acepto}
            onChange={(e) => setAcepto(e.target.checked)}
            className="w-7 h-7 mt-0.5 shrink-0 accent-ember-600"
          />
          <span className="text-lg text-sand-900">
            Leí y acepto los términos y la política de privacidad, y autorizo el tratamiento de los datos de salud que
            puedan aparecer.
          </span>
        </label>
        {error && (
          <p role="alert" className="text-clay-600 mb-3">
            {error}
          </p>
        )}
        <button
          onClick={aceptar}
          disabled={!acepto || enviando}
          className="min-h-[56px] w-full bg-ember-600 hover:bg-ember-700 text-white text-lg rounded-2xl font-semibold disabled:opacity-50 transition-colors"
        >
          {enviando ? "Guardando..." : "Aceptar y continuar"}
        </button>
        <button onClick={salir} className="min-h-[48px] w-full mt-2 text-sand-700 underline">
          No acepto, salir
        </button>
      </div>
    </div>
  );
}
