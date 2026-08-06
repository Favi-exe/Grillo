"use client";

import { useEffect, useState } from "react";
import type { Conversacion } from "@/lib/types";

function formatoRelativo(fechaIso: string): string {
  const diffMs = Date.now() - new Date(fechaIso).getTime();
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return "recién ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} día${dias === 1 ? "" : "s"}`;
}

/** Indicador de "cómo está" Carlos para la familia — reusa el log de conversaciones que ya se guarda en cada charla. */
export default function EstadoCarlos({ abueloId, nombre }: { abueloId: string; nombre: string }) {
  const [ultima, setUltima] = useState<Conversacion | null>(null);

  useEffect(() => {
    fetch(`/api/conversaciones?abueloId=${abueloId}`)
      .then((res) => res.json())
      .then((data) => {
        const conversaciones: Conversacion[] = data.conversaciones ?? [];
        if (conversaciones.length === 0) return;
        const masReciente = conversaciones.reduce((a, b) => (a.fecha > b.fecha ? a : b));
        setUltima(masReciente);
      })
      .catch((err) => console.error("[EstadoCarlos]", err));
  }, [abueloId]);

  return (
    <p className="text-base text-sand-600">
      {ultima
        ? `${nombre} habló con Grillo por última vez ${formatoRelativo(ultima.fecha)}`
        : `${nombre} todavía no charló con Grillo`}
    </p>
  );
}
