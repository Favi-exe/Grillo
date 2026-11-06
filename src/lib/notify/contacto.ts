import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/db/supabaseClient";
import { esEmailSintetico, telefonoDeEmailSintetico } from "@/lib/auth/telefono";
import { enviarEmail } from "@/lib/notify/email";
import { enviarWhatsApp } from "@/lib/notify/whatsapp";

export interface ContactoUsuario {
  email: string | null;
  telefono: string | null;
}

/**
 * A dónde se le puede escribir a una cuenta. Las cuentas creadas con
 * teléfono tienen un correo de Auth sintético (no sirve para escribirle a
 * nadie): su contacto real vive en app_metadata, que solo el servidor puede
 * modificar. Las cuentas antiguas, creadas con correo, siguen usando ese.
 */
export function contactoDeUsuarioAuth(user: Pick<User, "email" | "app_metadata">): ContactoUsuario {
  const meta = user.app_metadata ?? {};
  const emailContacto = typeof meta.email_contacto === "string" ? meta.email_contacto : null;
  const telefonoMeta = typeof meta.telefono === "string" ? meta.telefono : null;
  return {
    email: emailContacto ?? (user.email && !esEmailSintetico(user.email) ? user.email : null),
    telefono: telefonoMeta ?? telefonoDeEmailSintetico(user.email),
  };
}

export interface MensajeAUsuario {
  asunto: string;
  html: string;
  /** Mismo aviso, en texto plano para WhatsApp. */
  texto: string;
  plantillaWhatsApp?: { contentSid?: string; variables: Record<string, string> };
}

/**
 * Avisa a una cuenta por todos los canales que tenga: correo si lo dio,
 * WhatsApp si tiene teléfono. Devuelve si le llegó por al menos uno.
 */
export async function notificarUsuario(
  authUserId: string,
  mensaje: MensajeAUsuario
): Promise<boolean> {
  const { data, error } = await getSupabaseClient().auth.admin.getUserById(authUserId);
  if (error || !data?.user) return false;
  // Cuentas con los avisos desactivados (p. ej. con un correo que podría ser
  // de otra persona): no se les escribe.
  if (data.user.app_metadata?.sin_avisos === true) {
    console.log(`[notificar] ${authUserId} tiene los avisos desactivados: no se envía "${mensaje.asunto}"`);
    return false;
  }
  const { email, telefono } = contactoDeUsuarioAuth(data.user);

  const envios: Promise<boolean>[] = [];
  if (email) {
    envios.push(
      enviarEmail({ to: email, subject: mensaje.asunto, html: mensaje.html }).then((r) => r.enviado)
    );
  }
  if (telefono) {
    envios.push(
      enviarWhatsApp({
        to: telefono,
        texto: mensaje.texto,
        plantilla: mensaje.plantillaWhatsApp,
      }).then((r) => r.enviado)
    );
  }
  const resultados = await Promise.all(envios);
  return resultados.some(Boolean);
}
