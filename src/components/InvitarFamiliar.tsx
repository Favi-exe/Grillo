"use client";

import { useState } from "react";
import { fetchAbuelo } from "@/lib/auth/fetchConAuth";
import { PeopleIcon, CheckIcon } from "@/components/icons";

export default function InvitarFamiliar() {
  const [email, setEmail] = useState("");
  const [relacion, setRelacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetchAbuelo("/api/invitaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, relacion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pudimos enviar la invitación");
      setEnviada(true);
      setEmail("");
      setRelacion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar la invitación");
    } finally {
      setCargando(false);
    }
  }

  const inputCls =
    "min-h-[48px] border-2 border-sand-400 rounded-2xl px-3 text-base bg-white focus:outline-none focus:ring-4 focus:ring-dusk-200 focus:border-dusk-400";

  return (
    <div className="bg-white rounded-3xl shadow-warm-sm p-5">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-10 h-10 shrink-0 rounded-2xl bg-dusk-100 text-dusk-700 flex items-center justify-center">
          <PeopleIcon className="w-5 h-5" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-sand-900">
          Invitar a un familiar como acompañante
        </h2>
      </div>
      <p className="text-base text-sand-700 mb-4">
        Le mandamos un correo con un link para que se sume y pueda ver tus recuerdos, tus
        recordatorios y estar al tanto de cómo estás.
      </p>

      {enviada && (
        <div className="flex items-center gap-2 text-ember-700 bg-ember-50 rounded-2xl px-4 py-3 mb-4 animate-pop-in">
          <CheckIcon className="w-5 h-5" />
          <span>Invitación enviada.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
        <input
          type="email"
          required
          placeholder="Correo del familiar"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputCls} flex-1 min-w-[200px]`}
        />
        <input
          type="text"
          placeholder="Relación (ej. hija, nieto)"
          value={relacion}
          onChange={(e) => setRelacion(e.target.value)}
          className={`${inputCls} min-w-[160px]`}
        />
        <button
          type="submit"
          disabled={cargando}
          className="min-h-[48px] bg-dusk-700 hover:bg-dusk-800 text-white px-5 rounded-2xl font-semibold disabled:opacity-60 transition-colors"
        >
          {cargando ? "Enviando..." : "Invitar"}
        </button>
      </form>
      {error && <p className="text-clay-600 mt-2">{error}</p>}
    </div>
  );
}
