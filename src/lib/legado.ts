import { listMemorias } from "@/lib/db";
import type { Memoria } from "@/lib/types";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Arma el contenido del libro de "Legado Vivo": las historias reales que
 * Grillo fue guardando, agrupadas por tema en capítulos. Cada historia se
 * muestra tal como se capturó — Claude solo escribe una introducción breve
 * por capítulo, nunca reescribe ni inventa las historias en sí. Disponible
 * en cualquier momento (no solo tras un fallecimiento) — por eso es un
 * legado "vivo", no uno póstumo.
 */

export interface CapituloLibro {
  tema: string;
  introduccion: string;
  historias: { fecha: string; texto: string; personas: string[] }[];
}

export interface LibroLegado {
  nombreAbuelo: string;
  capitulos: CapituloLibro[];
  totalHistorias: number;
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function agruparPorTema(memorias: Memoria[]): Map<string, Memoria[]> {
  const grupos = new Map<string, Memoria[]>();
  for (const m of memorias) {
    const tema = (m.tema || "otros").trim().toLowerCase();
    const lista = grupos.get(tema) ?? [];
    lista.push(m);
    grupos.set(tema, lista);
  }
  for (const lista of grupos.values()) {
    lista.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  }
  return grupos;
}

async function generarIntroducciones(
  nombreAbuelo: string,
  grupos: Map<string, Memoria[]>
): Promise<Map<string, string>> {
  const fallback = new Map<string, string>();
  for (const tema of grupos.keys()) {
    fallback.set(tema, `Algunas de las historias que ${nombreAbuelo} compartió sobre ${tema}.`);
  }
  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Orden explícito: se lo pedimos a Claude en el mismo orden y hacemos
    // matching por posición, no por nombre — pedirle que repita el nombre
    // exacto del tema en su respuesta es frágil (basta con que agregue una
    // palabra o cambie una tilde para que el emparejamiento por texto
    // falle en silencio, como pasó con "pérdida" en las primeras pruebas).
    const temasEnOrden = [...grupos.keys()];
    const bloques = temasEnOrden
      .map((tema) => {
        const lista = (grupos.get(tema) ?? []).map((m) => `- ${m.resumen}`).join("\n");
        return `Tema: ${tema}\n${lista}`;
      })
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 900,
      system: `Eres Grillo. A partir de las historias reales que compartió ${nombreAbuelo} (agrupadas por tema abajo), vas a escribir una introducción breve y cálida (2 a 3 frases) para cada tema, para abrir esa sección de un pequeño libro de recuerdos que va a guardar su familia. Básate SOLO en lo que aparece abajo — nunca inventes nombres, fechas ni detalles que no estén ahí. Tono cercano y genuino, nunca cursi ni forzado, español neutro sin voseo, texto plano sin markdown. Responde con EXACTAMENTE ${temasEnOrden.length} introducciones, en el mismo orden en que aparecen los temas abajo, cada una separada por una línea con solo "---" (tres guiones) y nada más — sin repetir el nombre del tema, sin numerarlas, solo el texto de cada introducción.`,
      messages: [{ role: "user", content: bloques }],
    });

    const texto = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("\n")
      .trim();

    const introducciones = texto
      .split(/^\s*---\s*$/m)
      .map((s) => s.trim().replace(/\*\*(.+?)\*\*/g, "$1"))
      .filter(Boolean);

    const resultado = new Map<string, string>();
    if (introducciones.length === temasEnOrden.length) {
      temasEnOrden.forEach((tema, i) => resultado.set(tema, introducciones[i]));
    }

    // Completa con el fallback cualquier tema que no haya calzado — si el
    // conteo no coincidió, esto termina usando el fallback para todos.
    for (const [tema, textoFallback] of fallback) {
      if (!resultado.has(tema)) resultado.set(tema, textoFallback);
    }
    return resultado;
  } catch (err) {
    console.error("[legado] fallo generando introducciones:", err);
    return fallback;
  }
}

export async function armarLibroLegado(
  abueloId: string,
  nombreAbuelo: string
): Promise<LibroLegado> {
  const memorias = await listMemorias(abueloId);
  const grupos = agruparPorTema(memorias);
  const introducciones = await generarIntroducciones(nombreAbuelo, grupos);

  const capitulos: CapituloLibro[] = [...grupos.entries()].map(([tema, memoriasDelTema]) => ({
    tema: capitalizar(tema),
    introduccion: introducciones.get(tema) ?? "",
    historias: memoriasDelTema.map((m) => ({
      fecha: m.fecha,
      texto: m.resumen,
      personas: m.personas_mencionadas ?? [],
    })),
  }));

  // Capítulos más nutridos primero — el índice se siente más generoso al abrir el libro.
  capitulos.sort((a, b) => b.historias.length - a.historias.length);

  return { nombreAbuelo, capitulos, totalHistorias: memorias.length };
}
