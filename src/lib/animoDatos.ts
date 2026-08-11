import { listMemorias, listRegistrosAnimo } from "@/lib/db";
import { valenciaDe } from "@/lib/emociones";

/**
 * Combina las dos fuentes de ánimo que tiene Griyo: lo que infiere de una
 * charla (memorias.emocion_detectada) y lo que la persona reporta ella
 * misma ("¿cómo te sientes hoy?", registros_animo). Un mismo punto de
 * datos, para que el gráfico y la detección de ánimo bajo (lib/animo.ts)
 * no tengan que conocer las dos tablas por separado.
 */
export interface PuntoAnimo {
  fecha: string;
  valencia: number;
}

export async function obtenerPuntosAnimo(abueloId: string, desde: Date): Promise<PuntoAnimo[]> {
  const [memorias, registros] = await Promise.all([
    listMemorias(abueloId),
    listRegistrosAnimo(abueloId),
  ]);

  const puntos: PuntoAnimo[] = [];
  for (const m of memorias) {
    if (new Date(m.fecha) < desde) continue;
    puntos.push({ fecha: m.fecha, valencia: valenciaDe(m.emocion_detectada) });
  }
  for (const r of registros) {
    if (new Date(r.fecha) < desde) continue;
    puntos.push({ fecha: r.fecha, valencia: r.valencia });
  }
  return puntos;
}
