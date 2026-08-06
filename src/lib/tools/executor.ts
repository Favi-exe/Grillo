import {
  createRecordatorio,
  listRecordatorios,
  createMemoria,
} from "@/lib/db";
import { getClima } from "@/lib/ai/weather";
import { indexarMemoria, buscarMemoriasSimilares } from "@/lib/ai/pinecone";
import type { TipoRecordatorio } from "@/lib/types";

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
      const memoria = await createMemoria({
        abuelo_id: ctx.abueloId,
        resumen: String(input.resumen ?? ""),
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
