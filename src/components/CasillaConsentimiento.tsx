"use client";

import Link from "next/link";

/** Casilla "acepto los términos y la política de privacidad" de los formularios de registro. */
export default function CasillaConsentimiento({
  checked,
  onChange,
  grande = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  grande?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${grande ? "text-lg" : "text-base"} text-sand-800`}>
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`${grande ? "w-7 h-7" : "w-6 h-6"} mt-0.5 shrink-0 accent-ember-600`}
      />
      <span>
        Acepto los{" "}
        <Link href="/terminos" target="_blank" className="text-ember-700 underline font-semibold">
          términos de uso
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" target="_blank" className="text-ember-700 underline font-semibold">
          política de privacidad
        </Link>
        , incluido el tratamiento de datos de salud que pueda aparecer en las conversaciones.
      </span>
    </label>
  );
}
