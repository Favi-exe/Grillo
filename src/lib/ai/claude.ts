import { buildSystemPrompt, GRILLO_TOOLS } from "@/lib/tools/definitions";
import { executeTool, type ToolContext, type ToolExecutionResult } from "@/lib/tools/executor";
import type { ChatMessage } from "@/lib/types";
import type Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface ChatResult {
  reply: string;
  toolCalls: ToolExecutionResult[];
  fuente: "mock" | "real";
}

export async function chatWithGrillo(
  ctx: ToolContext,
  nombreAbuelo: string,
  notasGenerales: string | null | undefined,
  historia: ChatMessage[],
  mensajeUsuario: string
): Promise<ChatResult> {
  if (isClaudeConfigured()) {
    try {
      return await chatReal(ctx, nombreAbuelo, notasGenerales, historia, mensajeUsuario);
    } catch (err) {
      console.error("[claude] fallo API real, usando mock:", err);
    }
  }
  return chatMock(ctx, mensajeUsuario);
}

const ZONA_HORARIA = "America/Santiago";

function describirMomentoActual(): string {
  const ahora = new Date();
  const partes = new Intl.DateTimeFormat("es-CL", {
    timeZone: ZONA_HORARIA,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(ahora);

  const diaSemana = partes.find((p) => p.type === "weekday")?.value ?? "";
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? "12");
  const minuto = partes.find((p) => p.type === "minute")?.value ?? "00";

  let franja: string;
  if (hora >= 6 && hora < 12) franja = "por la mañana";
  else if (hora >= 12 && hora < 14) franja = "al mediodía";
  else if (hora >= 14 && hora < 19) franja = "por la tarde";
  else if (hora >= 19 && hora < 23) franja = "por la noche";
  else franja = "de madrugada";

  return `${diaSemana} ${franja}, ${String(hora).padStart(2, "0")}:${minuto}`;
}

async function chatReal(
  ctx: ToolContext,
  nombreAbuelo: string,
  notasGenerales: string | null | undefined,
  historia: ChatMessage[],
  mensajeUsuario: string
): Promise<ChatResult> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = buildSystemPrompt(nombreAbuelo, notasGenerales, describirMomentoActual());

  const messages: Anthropic.MessageParam[] = [
    ...historia.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: "user", content: mensajeUsuario },
  ];

  const toolCalls: ToolExecutionResult[] = [];
  let finalText = "";

  for (let turn = 0; turn < 5; turn++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages,
      tools: GRILLO_TOOLS,
    });

    const textBlocks = response.content.filter((b) => b.type === "text") as Anthropic.TextBlock[];
    const texto = textBlocks.map((b) => b.text).join("\n").trim();
    // Solo pisa finalText si el turno trajo texto de verdad — un turno de
    // puro tool_use (p. ej. guardar_memoria discreto) no debe borrar la
    // respuesta conversacional que ya se había armado en un turno previo.
    if (texto) finalText = texto;

    if (response.stop_reason !== "tool_use") {
      break;
    }

    const toolUseBlocks = response.content.filter(
      (b) => b.type === "tool_use"
    ) as Anthropic.ToolUseBlock[];

    messages.push({ role: "assistant", content: response.content });

    const toolResultContents: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input as Record<string, unknown>, ctx);
      toolCalls.push(result);
      toolResultContents.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result.resultado),
      });
    }

    messages.push({ role: "user", content: toolResultContents });
  }

  // Si después de usar herramientas (p. ej. guardar_memoria de forma
  // discreta) el modelo nunca escribió una respuesta conversacional — pasa
  // cuando el último turno termina siendo solo un tool_use — no mostramos
  // el genérico "¿me repites?": eso hace que la persona repita la misma
  // historia y quede guardada duplicada. En vez de eso, forzamos una
  // respuesta de texto con lo que ya se sabe de la conversación.
  if (!finalText) {
    const respuestaForzada = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages,
      // Sin `tools`: no puede volver a esconderse detrás de otro tool_use,
      // tiene que contestar en texto sí o sí.
    });
    finalText = respuestaForzada.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("\n")
      .trim();
  }

  return { reply: finalText || "Perdón, ¿me repites? Me quedé pensando.", toolCalls, fuente: "real" };
}

// ---------------------------------------------------------------------------
// Modo mock: heurísticas simples para disparar tools + respuestas cálidas
// variadas, sin necesitar la API key de Anthropic.
// ---------------------------------------------------------------------------

const RESPUESTAS_SALUDO = [
  "¡Qué bueno escucharte! ¿Cómo va tu día hasta ahora?",
  "Hola, hola. Me alegra que charlemos un rato. ¿Cómo estás?",
  "Aquí estoy, con ganas de escucharte. ¿Cómo te sientes hoy?",
];

const RESPUESTAS_GENERICAS = [
  "Te escucho. Cuéntame un poco más, ¿cómo seguiste con eso?",
  "Qué interesante lo que cuentas. ¿Y cómo te sentiste en ese momento?",
  "Me gusta charlar de esto contigo. ¿Hay algo más que quieras contarme?",
  "Ajá, entiendo. ¿Quieres que hablemos de otra cosa o seguimos con esto?",
  "Qué lindo que me compartas eso. Sigue, te escucho.",
];

const INVITACIONES_RECUERDO = [
  "Se me ocurrió algo: ¿me cuentas cómo era tu barrio cuando eras niño?",
  "Tengo curiosidad, ¿me cuentas cómo conociste a tu esposa?",
  "¿Sabes qué me gustaría saber? Alguna anécdota graciosa de cuando eras joven.",
];

const RESPUESTAS_MEMORIA_GUARDADA = [
  "Qué historia tan linda. Me encanta que me la hayas contado.",
  "Se nota que fue un momento importante para ti. Gracias por compartirlo.",
  "Qué recuerdo tan bonito. Seguro tu familia también lo va a disfrutar algún día.",
];

const PALABRAS_MEMORIA = [
  "me acuerdo", "recuerdo", "cuando era", "de joven", "de chico", "de chica",
  "mi esposa", "mi esposo", "mi marido", "mi mujer", "mi papá", "mi mamá",
  "hace años", "en esa época", "conocí", "nací", "trabajaba", "mi pueblo",
  "la guerra", "mi infancia", "me casé", "mis hijos cuando",
];

const PALABRAS_CLIMA = ["clima", "tiempo hace", "hace frío", "hace calor", "llueve", "va a llover"];

function detectarHora(texto: string): string | null {
  const match24 = texto.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (match24) {
    const h = match24[1].padStart(2, "0");
    return `${h}:${match24[2]}`;
  }
  const matchPalabra = texto.match(/\ba las?\s+(\d{1,2})(?:\s*(?:hs|horas))?\b/i);
  if (matchPalabra) {
    const h = matchPalabra[1].padStart(2, "0");
    return `${h}:00`;
  }
  return null;
}

function detectarTipoRecordatorio(texto: string): "medicamento" | "agua" | "cita" | "evento" | "otro" {
  const t = texto.toLowerCase();
  if (/(pastilla|remedio|medicament)/.test(t)) return "medicamento";
  if (/agua|hidrat/.test(t)) return "agua";
  if (/(cita|médico|doctor|turno)/.test(t)) return "cita";
  if (/(cumpleaños|evento|visita|familia)/.test(t)) return "evento";
  return "otro";
}

async function chatMock(ctx: ToolContext, mensajeUsuario: string): Promise<ChatResult> {
  const texto = mensajeUsuario.toLowerCase();
  const toolCalls: ToolExecutionResult[] = [];

  const esRecordatorio = /(record|recu[eé]rdame|acu[eé]rdate|no.{0,3}olvid)/.test(texto);
  const esClima = PALABRAS_CLIMA.some((p) => texto.includes(p));
  const esMemoria =
    mensajeUsuario.length > 60 && PALABRAS_MEMORIA.some((p) => texto.includes(p));
  const esSaludo = /^(hola|buen[oa]s|qué tal|como estas|cómo estás)/.test(texto.trim());

  if (esRecordatorio) {
    const hora = detectarHora(texto) ?? "09:00";
    const tipo = detectarTipoRecordatorio(texto);
    const result = await executeTool(
      "crear_recordatorio",
      {
        tipo,
        descripcion: mensajeUsuario.replace(/^.*(record\w*|recu[eé]rdame|acu[eé]rdate)\s*(que|de)?\s*/i, "").trim() || "Recordatorio",
        hora,
        frecuencia: tipo === "medicamento" ? "diario" : "una_vez",
      },
      ctx
    );
    toolCalls.push(result);
    return {
      reply: `Listo, te voy a recordar eso a las ${hora}. Cuenta conmigo.`,
      toolCalls,
      fuente: "mock",
    };
  }

  if (esClima) {
    const result = await executeTool("consultar_clima", {}, ctx);
    toolCalls.push(result);
    const clima = result.resultado as { temperatura: number; descripcion: string };
    return {
      reply: `Hoy está ${clima.descripcion}, con ${clima.temperatura} grados. Buen día para salir a caminar un rato, ¿no crees?`,
      toolCalls,
      fuente: "mock",
    };
  }

  if (esMemoria) {
    const result = await executeTool(
      "guardar_memoria",
      {
        resumen: mensajeUsuario.slice(0, 220),
        transcripcion_original: mensajeUsuario,
        tema: "vida personal",
        personas_mencionadas: [],
        emocion_detectada: "nostalgia",
      },
      ctx
    );
    toolCalls.push(result);
    const reply = pick(RESPUESTAS_MEMORIA_GUARDADA);
    return { reply, toolCalls, fuente: "mock" };
  }

  if (esSaludo) {
    return { reply: pick(RESPUESTAS_SALUDO), toolCalls, fuente: "mock" };
  }

  // A veces invita a compartir un recuerdo, para simular el comportamiento espontáneo
  const invitar = Math.random() < 0.25;
  return {
    reply: invitar ? pick(INVITACIONES_RECUERDO) : pick(RESPUESTAS_GENERICAS),
    toolCalls,
    fuente: "mock",
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
