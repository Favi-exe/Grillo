"use client";

import { useEffect, useState } from "react";

const BUILD_ACTUAL = process.env.NEXT_PUBLIC_BUILD_ID;
const INTERVALO_MS = 5 * 60 * 1000; // cada 5 minutos alcanza — no hace falta molestar más seguido

/**
 * Detecta cuando el deploy en el servidor cambió respecto al que tiene
 * cargado esta pestaña. Pensado para el dispositivo del abuelo, que queda
 * con la sesión abierta indefinidamente y puede no recargarse nunca por
 * su cuenta — sin esto, alguien podría quedarse semanas en una versión
 * vieja sin saberlo.
 */
export function useActualizacionDisponible(): boolean {
  const [hayActualizacion, setHayActualizacion] = useState(false);

  useEffect(() => {
    if (!BUILD_ACTUAL || hayActualizacion) return;

    async function chequear() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const data = await res.json();
        if (data.buildId && data.buildId !== BUILD_ACTUAL) {
          setHayActualizacion(true);
        }
      } catch {
        // Sin conexión momentánea u otro problema — no molestamos, se
        // reintenta solo en el próximo intervalo.
      }
    }

    chequear();
    const id = setInterval(chequear, INTERVALO_MS);
    return () => clearInterval(id);
  }, [hayActualizacion]);

  return hayActualizacion;
}
