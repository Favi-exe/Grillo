import { listFamiliaresDeAbuelo } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { notificarUsuario } from "@/lib/notify/contacto";

const URL_APP = (process.env.NEXT_PUBLIC_APP_URL || "https://griyo.cl").replace(/\/$/, "");

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Le escribe a cada familiar vinculado (por correo y/o WhatsApp) cuando la
 * persona mayor lleva días sin conversar con Griyo. Devuelve a cuántos les llegó.
 */
export async function enviarEmailAFamilia(
  abueloId: string,
  nombreAbuelo: string,
  diasSinCharla: number | null
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const familiares = await listFamiliaresDeAbuelo(abueloId);
  if (familiares.length === 0) return 0;
  const nombre = escapar(nombreAbuelo);

  const asunto =
    diasSinCharla === null
      ? `${nombreAbuelo} todavía no ha conversado con Griyo`
      : `${nombreAbuelo} lleva ${diasSinCharla} días sin conversar con Griyo`;
  const cuerpo =
    diasSinCharla === null
      ? `<p>${nombre} todavía no ha empezado a conversar con Griyo. A veces solo hace falta que alguien le acompañe la primera vez: abrir la aplicación juntos y saludar.</p>`
      : `<p>${nombre} lleva ${diasSinCharla} días sin conversar con Griyo. Puede ser algo pasajero, pero quizás sea un buen momento para llamar o pasar a ver a ${nombre}, y recordarle que Griyo está disponible cuando quiera conversar.</p>`;

  const textoWhatsApp =
    diasSinCharla === null
      ? `${nombreAbuelo} todavía no ha empezado a conversar con Griyo. A veces solo hace falta que alguien le acompañe la primera vez: abrir la aplicación juntos y saludar.`
      : `${nombreAbuelo} lleva ${diasSinCharla} días sin conversar con Griyo. Puede ser algo pasajero, pero quizás sea un buen momento para llamar o pasar a ver a ${nombreAbuelo}.`;

  let enviados = 0;
  await Promise.all(
    familiares.map(async (f) => {
      if (!f.auth_user_id) return;
      const llego = await notificarUsuario(f.auth_user_id, {
        asunto,
        html: `${cuerpo}<p><a href="${URL_APP}/familia">Ver cómo viene ${nombre}</a></p><p style="color:#8C7867;font-size:12px">Griyo no es un dispositivo médico. Este aviso es orientativo.</p>`,
        texto: `${textoWhatsApp}\n\nVer cómo viene: ${URL_APP}/familia`,
        plantillaWhatsApp: {
          contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID_INACTIVIDAD,
          variables: { "1": nombreAbuelo, "2": diasSinCharla === null ? "—" : String(diasSinCharla) },
        },
      });
      if (llego) enviados++;
    })
  );
  return enviados;
}
