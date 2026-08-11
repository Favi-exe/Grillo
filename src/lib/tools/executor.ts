import {
  createRecordatorio,
  listRecordatorios,
  createMemoria,
  listMemorias,
} from "@/lib/db";
import { getClima } from "@/lib/ai/weather";
import { indexarMemoria, buscarMemoriasSimilares } from "@/lib/ai/pinecone";
import type { TipoRecordatorio } from "@/lib/types";

const VENTANA_DUPLICADOS_HORAS = 6;
const UMBRAL_SIMILITUD = 0.75;

function normalizarPalabras(texto: string): Set<string> {
  return new Set(
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((palabra) => palabra.length > 2)
  );
}

// Coeficiente de solapamiento (no Jaccard): usa el conjunto MÁS CHICO como
// denominador, para que un resumen breve que repite lo esencial de uno más
// largo (o viceversa) igual se detecte como el mismo recuerdo.
function similitud(a: string, b: string): number {
  const palabrasA = normalizarPalabras(a);
  const palabrasB = normalizarPalabras(b);
  if (palabrasA.size === 0 || palabrasB.size === 0) return 0;
  let interseccion = 0;
  for (const palabra of palabrasA) {
    if (palabrasB.has(palabra)) interseccion++;
  }
  return interseccion / Math.min(palabrasA.size, palabrasB.size);
}

export interface ToolContext {
  abueloId: string;
  usuarioId: string;
}

export interface ToolExecutionResult {
  nombre: string;
  input: Record<string, unknown>;
  resultado: unknown;
}

export async function executeTool(
  nombre: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolExecutionResult> {
  switch (nombre) {
    case "crear_recordatorio": {
      const recordatorio = await createRecordatorio({
        abuelo_id: ctx.abueloId,
        tipo: (input.tipo as TipoRecordatorio) ?? "otro",
        descripcion: String(input.descripcion ?? ""),
        hora: String(input.hora ?? "09:00"),
        frecuencia: (input.frecuencia as "una_vez" | "diario" | "semanal") ?? "una_vez",
        creado_por: ctx.usuarioId,
        activo: true,
        ultima_notificacion: null,
      });
      return { nombre, input, resultado: recordatorio };
    }

    case "consultar_recordatorios": {
      const recordatorios = await listRecordatorios(ctx.abueloId);
      return { nombre, input, resultado: recordatorios.filter((r) => r.activo) };
    }

    case "guardar_memoria": {
      const resumenNuevo = String(input.resumen ?? "");

      // Red de seguridad extra contra duplicados: si la persona repite una
      // historia que ya se guardó hace poco (p. ej. porque Griyo no
      // respondió bien la primera vez y se lo volvió a contar), no la
      // vuelve a guardar como un recuerdo aparte.
      const existentes = await listMemorias(ctx.abueloId);
      const yaGuardada = existentes.find((m) => {
        const horasDesde = (Date.now() - new Date(m.fecha).getTime()) / 3_600_000;
        return horasDesde <= VENTANA_DUPLICADOS_HORAS && similitud(m.resumen, resumenNuevo) >= UMBRAL_SIMILITUD;
      });
      if (yaGuardada) {
        return { nombre, input, resultado: { yaGuardada: true, memoria: yaGuardada } };
      }

      const memoria = await createMemoria({
        abuelo_id: ctx.abueloId,
        resumen: resumenNuevo,
        transcripcion_original: String(input.transcripcion_original ?? ""),
        tema: String(input.tema ?? "general"),
        personas_mencionadas: Array.isArray(input.personas_mencionadas)
          ? (input.personas_mencionadas as string[])
          : [],
        emocion_detectada: String(input.emocion_detectada ?? "neutral"),
        fecha: new Date().toISOString(),
        embedding_id_pinecone: null,
      });
      const embeddingId = await indexarMemoria(memoria.id, ctx.abueloId, memoria.resumen);
      return { nombre, input, resultado: { ...memoria, embedding_id_pinecone: embeddingId } };
    }

    case "buscar_memorias": {
      const consulta = String(input.consulta ?? "");
      const resultados = await buscarMemoriasSimilares(ctx.abueloId, consulta);
      return { nombre, input, resultado: resultados };
    }

    case "consultar_clima": {
      const ciudad = typeof input.ciudad === "string" && input.ciudad ? input.ciudad : undefined;
      const clima = await getClima(ciudad);
      return { nombre, input, resultado: clima };
    }

    default:
      return { nombre, input, resultado: { error: `Tool desconocida: ${nombre}` } };
  }
}
