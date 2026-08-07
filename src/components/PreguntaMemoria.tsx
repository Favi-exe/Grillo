"use client";

import { useState } from "react";
import { fetchFamiliar } from "@/lib/auth/fetchConAuth";
import { SearchIcon } from "@/components/icons";

interface RespuestaMemoria {
  respuesta: string;
  memoriasUsadas: { id: string; texto: string }[];
  fuente: "mock" | "real";
}

export default function PreguntaMemoria({ abueloNombre }: { abueloNombre: string }) {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState<RespuestaMemoria | null>(null);
  const [cargando, setCargando] = useState(false);

  async function preguntar(e: React.FormEvent) {
    e.preventDefault();
    if (!pregunta.trim()) return;
    setCargando(true);
    setRespuesta(null);
    try {
      const res = await fetchFamiliar("/api/memorias/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta }),
      });
      const data = await res.json();
      setRespuesta(data);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="bg-dusk-700 rounded-3xl shadow-warm p-5">
      <h2 className="font-heading text-lg font-semibold text-white mb-1">
        Pregúntale a la memoria de {abueloNombre}
      </h2>
      <p className="text-base text-dusk-100 mb-4">
        Ej: &quot;cuéntame una historia sobre mi papá&quot; o &quot;¿cómo conoció a mi mamá?&quot;
      </p>

      <form onSubmit={preguntar} className="flex gap-2 mb-4">
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Escribe tu pregunta..."
          className="flex-1 min-h-[52px] border-0 rounded-2xl px-4 text-lg bg-white/95 text-sand-900 placeholder:text-sand-600 focus:outline-none focus:ring-4 focus:ring-white/40"
        />
        <button
          type="submit"
          disabled={cargando}
          className="min-h-[52px] bg-ember-600 hover:bg-ember-700 text-white px-5 rounded-2xl font-semibold flex items-center gap-2 disabled:opacity-60 transition-colors"
        >
          <SearchIcon className="w-5 h-5" />
          {cargando ? "Buscando..." : "Preguntar"}
        </button>
      </form>

      {cargando && (
        <div className="flex items-center gap-1.5 px-1">
          <span className="w-2 h-2 rounded-full bg-white/70 animate-think-dot" />
          <span className="w-2 h-2 rounded-full bg-white/70 animate-think-dot stagger-1" />
          <span className="w-2 h-2 rounded-full bg-white/70 animate-think-dot stagger-2" />
        </div>
      )}

      {respuesta && (
        <div className="bg-white/95 rounded-2xl p-4 animate-pop-in">
          <p className="text-sand-900 text-lg leading-relaxed whitespace-pre-line">{respuesta.respuesta}</p>
          {respuesta.memoriasUsadas.length > 0 && (
            <div className="mt-3 pt-3 border-t border-sand-300">
              <p className="text-sm text-sand-600">
                Basado en {respuesta.memoriasUsadas.length} recuerdo(s) guardado(s)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
