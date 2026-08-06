import { buscarMemoriasSimilares } from "./pinecone";
import { isClaudeConfigured } from "./claude";
import { listMemorias } from "@/lib/db";
import type Anthropic from "@anthropic-ai/sdk";

export interface RespuestaMemoriaFamiliar {
  respuesta: string;
  memoriasUsadas: { id: string; texto: string }[];
  fuente: "mock" | "real";
}

export async function preguntarMemorias(
  abueloId: string,
  pregunta: string,
  nombreAbuelo: string
): Promise<RespuestaMemoriaFamiliar> {
  const resultados = await buscarMemoriasSimilares(abueloId, pregunta, 4);

  if (resultados.length === 0) {
    return {
      respuesta: `Todavía no hay recuerdos guardados de ${nombreAbuelo} sobre eso. A medida que converse con Grillo, van a ir apareciendo más historias aquí.`,
      memoriasUsadas: [],
      fuente: "mock",
    };
  }

  if (isClaudeConfigured()) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const contexto = resultados.map((r, i) => `Recuerdo ${i + 1}: ${r.texto}`).join("\n\n");

      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 600,
        system: `Sos Grillo. Un familiar te está preguntando por recuerdos de ${nombreAbuelo} que ya fueron capturados en conversaciones previas. Respondé de forma cálida, en tercera persona, contando la historia como si se la relataras a la familia. Basate SOLO en los recuerdos provistos; si no alcanza para responder del todo, decilo con honestidad.`,
        messages: [
          {
            role: "user",
            content: `Pregunta de la familia: "${pregunta}"\n\nRecuerdos disponibles:\n${contexto}`,
          },
        ],
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as Anthropic.TextBlock).text)
        .join("\n")
        .trim();

      return {
        respuesta: text || "No encontré una respuesta clara con los recuerdos disponibles.",
        memoriasUsadas: resultados.map((r) => ({ id: r.id, texto: r.texto })),
        fuente: "real",
      };
    } catch (err) {
      console.error("[ragAsk] fallo API real, usando mock:", err);
    }
  }

  // Mock: síntesis simple sin LLM, concatenando los recuerdos más relevantes.
  const memorias = await listMemorias(abueloId);
  const detalles = resultados
    .map((r) => {
      const memoria = memorias.find((m) => m.id === r.id);
      return memoria ? memoria.resumen : r.texto;
    })
    .filter(Boolean);

  const respuesta =
    detalles.length > 0
      ? `Sobre eso, ${nombreAbuelo} contó lo siguiente: ${detalles.join(" También recordó que ")}`
      : `Encontré algunos recuerdos relacionados, pero no tengo suficiente detalle todavía.`;

  return {
    respuesta,
    memoriasUsadas: resultados.map((r) => ({ id: r.id, texto: r.texto })),
    fuente: "mock",
  };
}
