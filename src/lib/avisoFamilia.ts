import { listFamiliaresDeAbuelo } from "@/lib/db";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { enviarEmail } from "@/lib/notify/email";

const URL_APP = (process.env.NEXT_PUBLIC_APP_URL || "https://griyo.cl").replace(/\/$/, "");

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Le escribe a cada familiar vinculado cuando la persona mayor lleva días sin
 * conversar con Griyo. Devuelve a cuántos se les mandó el correo.
 */
export async function enviarEmailAFamilia(
  abueloId: string,
  nombreAbuelo: string,
  diasSinCharla: number | null
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const familiares = await listFamiliaresDeAbuelo(abueloId);
  if (familiares.length === 0) return 0;
  const client = getSupabaseClient();
  const nombre = escapar(nombreAbuelo);

  const asunto =
    diasSinCharla === null
      ? `${nombreAbuelo} todavía no ha conversado con Griyo`
      : `${nombreAbuelo} lleva ${diasSinCharla} días sin conversar con Griyo`;
  const cuerpo =
    diasSinCharla === null
      ? `<p>${nombre} todavía no ha empezado a conversar con Griyo. A veces solo hace falta que alguien le acompañe la primera vez: abrir la aplicación juntos y saludar.</p>`
      : `<p>${nombre} lleva ${diasSinCharla} días sin conversar con Griyo. Puede ser algo pasajero, pero quizás sea un buen momento para llamar o pasar a ver a ${nombre}, y recordarle que Griyo está disponible cuando quiera conversar.</p>`;

  let enviados = 0;
  await Promise.all(
    familiares.map(async (f) => {
      if (!f.auth_user_id) return;
      const { data, error } = await client.auth.admin.getUserById(f.auth_user_id);
      const email = data?.user?.email;
      if (error || !email) return;
      const r = await enviarEmail({
        to: email,
        subject: asunto,
        html: `${cuerpo}<p><a href="${URL_APP}/familia">Ver cómo viene ${nombre}</a></p><p style="color:#8C7867;font-size:12px">Griyo no es un dispositivo médico. Este aviso es orientativo.</p>`,
      });
      if (r.enviado) enviados++;
    })
  );
  return enviados;
}
