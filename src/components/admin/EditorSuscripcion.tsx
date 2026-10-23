"use client";

import { useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { ESTADOS_SUSCRIPCION, PLANES } from "@/lib/admin/planes";
import type { FamiliaAdmin } from "@/lib/admin/resumen";
import type { EstadoSuscripcion } from "@/lib/types";

interface Form {
  plan: string;
  estado: EstadoSuscripcion;
  precio: string;
  inicio: string;
  proximoCobro: string;
  notas: string;
}

function formularioInicial(f: FamiliaAdmin): Form {
  const s = f.suscripcion;
  return {
    plan: s?.plan ?? "piloto",
    estado: s?.estado ?? "piloto",
    precio: String(s?.precio_clp ?? 0),
    inicio: s?.inicio ?? "",
    proximoCobro: s?.proximo_cobro ?? "",
    notas: s?.notas ?? "",
  };
}

const CAMPO =
  "w-full min-h-[46px] rounded-2xl border border-sand-500 bg-white px-3.5 text-base text-sand-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300";

export default function EditorSuscripcion({
  familia,
  onGuardado,
  onCancelar,
}: {
  familia: FamiliaAdmin;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState<Form>(() => formularioInicial(familia));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const res = await fetchFamiliar("/api/admin/suscripciones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abueloId: familia.abueloId,
          plan: form.plan,
          estado: form.estado,
          precio_clp: Number(form.precio),
          inicio: form.inicio || null,
          proximo_cobro: form.proximoCobro || null,
          notas: form.notas,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  const etiqueta = "grid gap-1.5 text-sm font-semibold text-sand-800";

  return (
    <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
      <label className={etiqueta}>
        Plan
        <select
          className={CAMPO}
          value={form.plan}
          onChange={(e) => {
            const plan = PLANES.find((p) => p.id === e.target.value);
            setForm((f) => ({ ...f, plan: e.target.value, precio: plan ? String(plan.precioSugerido) : f.precio }));
          }}
        >
          {PLANES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className={etiqueta}>
        Estado
        <select className={CAMPO} value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as EstadoSuscripcion }))}>
          {ESTADOS_SUSCRIPCION.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className={etiqueta}>
        Precio mensual (CLP)
        <input
          className={CAMPO}
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={form.precio}
          onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
          required
        />
      </label>
      <label className={etiqueta}>
        Inicio
        <input className={CAMPO} type="date" value={form.inicio} onChange={(e) => setForm((f) => ({ ...f, inicio: e.target.value }))} />
      </label>
      <label className={etiqueta}>
        Próximo cobro
        <input className={CAMPO} type="date" value={form.proximoCobro} onChange={(e) => setForm((f) => ({ ...f, proximoCobro: e.target.value }))} />
      </label>
      <label className={`${etiqueta} sm:col-span-2`}>
        Notas
        <textarea
          className={`${CAMPO} py-2.5`}
          rows={2}
          maxLength={500}
          value={form.notas}
          onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
        />
      </label>
      {error && (
        <p role="alert" className="sm:col-span-2 text-sm font-semibold text-clay-600">
          {error}
        </p>
      )}
      <div className="sm:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={guardando}
          className="min-h-[46px] px-6 rounded-full bg-ember-500 text-white font-semibold hover:bg-ember-600 disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
        >
          {guardando ? "Guardando…" : "Guardar plan"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="min-h-[46px] px-4 rounded-full text-sand-800 hover:bg-sand-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
