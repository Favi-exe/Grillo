import { listMemorias, listFamiliaresDeAbuelo, crearAlertaAnimo, listAlertasAnimo } from "@/lib/db";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { enviarEmail } from "@/lib/notify/email";
import { valenciaDe } from "@/lib/emociones";
import type { Memoria } from "@/lib/types";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Detección de ánimo bajo sostenido — NO es un diagnóstico clínico, es una
 * observación de patrón (varios días de tristeza/soledad/preocupación, no
 * un evento aislado) que se le comunica a la familia como lo haría alguien
 * cercano que lo escucha seguido, nunca como una evaluación médica.
 */

const DIAS_VENTANA = 4;
const MIN_MEMORIAS_PARA_PATRON = 3;
const VALENCIA_PREOCUPANTE = 2; // promedio <= 2 → tristeza/soledad/preocupación sostenida
const HORAS_ENTRE_AVISOS = 48; // no repetir el mismo aviso todos los días

export async function chequearYAvisarAnimo(abueloId: string, nombreAbuelo: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const alertasPrevias = await listAlertasAnimo(abueloId);
  const ultima = alertasPrevias[0];
  if (ultima) {
    const horasDesde = (Date.now() - new Date(ultima.fecha).getTime()) / 3_600_000;
    if (horasDesde < HORAS_ENTRE_AVISOS) return;
  }

  const desde = new Date(Date.now() - DIAS_VENTANA * 24 * 60 * 60 * 1000);
  const memorias = await listMemorias(abueloId);
  const recientes = memorias.filter((m) => new Date(m.fecha) >= desde);
  if (recientes.length < MIN_MEMORIAS_PARA_PATRON) return;

  const promedio =
    recientes.reduce((suma, m) => suma + valenciaDe(m.emocion_detectada), 0) / recientes.length;
  if (promedio > VALENCIA_PREOCUPANTE) return;

  const resumen = await generarResumenAnimo(nombreAbuelo, recientes);
  await crearAlertaAnimo(abueloId, resumen);
  await avisarFamiliaPorAnimo(abueloId, nombreAbuelo, resumen);
}

async function generarResumenAnimo(nombreAbuelo: string, recientes: Memoria[]): Promise<string> {
  const fallback = `${nombreAbuelo} viene con el ánimo más bajo los últimos días. Podría ser un buen momento para llamarlo o visitarlo.`;
  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const contexto = recientes
      .slice(0, 6)
      .map((m) => `- (${m.emocion_detectada}) ${m.resumen}`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 200,
      system: `Eres Grillo. Vas a escribirle una nota corta y cálida a la familia de ${nombreAbuelo}, contándoles que notaste que su ánimo viene bajo estos últimos días. Básate SOLO en lo que aparece abajo. 2 a 3 frases, tono cercano y directo, nunca alarmista ni clínico — esto es una observación de alguien que lo/la escucha seguido, no un diagnóstico. Si hay un motivo concreto mencionado (algo que dijo sobre su familia, su salud, su rutina), nómbralo puntualmente. Termina sugiriendo con calidez que alguien lo llame o lo visite. Español neutro, sin voseo. Texto plano nada más — sin markdown, sin asteriscos, sin encabezados, sin listas.`,
      messages: [
        {
          role: "user",
          content: `Últimos recuerdos/momentos de ${nombreAbuelo} con su emoción detectada:\n${contexto}`,
        },
      ],
    });
    const texto = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("\n")
      .trim()
      // Red de seguridad por si igual se cuela algo de markdown — esto se
      // muestra como texto plano en la UI y en el cuerpo del correo.
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/^#+\s*/gm, "");
    return texto || fallback;
  } catch (err) {
    console.error("[animo] fallo generando el resumen:", err);
    return fallback;
  }
}

async function avisarFamiliaPorAnimo(
  abueloId: string,
  nombreAbuelo: string,
  resumen: string
): Promise<void> {
  const familiares = await listFamiliaresDeAbuelo(abueloId);
  if (familiares.length === 0) return;
  const client = getSupabaseClient();

  await Promise.all(
    familiares.map(async (familiar) => {
      if (!familiar.auth_user_id) return;
      const { data, error } = await client.auth.admin.getUserById(familiar.auth_user_id);
      const email = data?.user?.email;
      if (error || !email) return;
      await enviarEmail({
        to: email,
        subject: `💭 ${nombreAbuelo} viene con el ánimo más bajo`,
        html: `<p>${resumen}</p>`,
      });
    })
  );
}
