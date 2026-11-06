import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { normalizarTelefono, emailSinteticoDeTelefono } from "@/lib/auth/telefono";
import { contactoDeUsuarioAuth } from "@/lib/notify/contacto";
import { enviarWhatsApp, isWhatsAppConfigured } from "@/lib/notify/whatsapp";
import { enviarEmail, isEmailConfigured } from "@/lib/notify/email";

export const dynamic = "force-dynamic";

const ESPERA_ENTRE_ENVIOS_MS = 60_000;

/**
 * Recuperación de contraseña por número de teléfono: genera el link de
 * Supabase sin que Supabase mande nada, y lo envía por WhatsApp (y al
 * correo opcional, si la cuenta lo tiene). La respuesta es SIEMPRE la
 * misma exista o no la cuenta, para que nadie pueda usar esto para
 * averiguar qué números están registrados.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Esto necesita Supabase conectado en este servidor." },
      { status: 503 }
    );
  }
  const esProduccion = process.env.NODE_ENV === "production";
  if (esProduccion && !isWhatsAppConfigured() && !isEmailConfigured()) {
    return NextResponse.json(
      { error: "La recuperación de cuenta todavía no está disponible. Escríbenos y te ayudamos." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const telefono = normalizarTelefono(String(body.telefono ?? ""));
    if (!telefono) {
      return NextResponse.json(
        { error: "Escribe un número de WhatsApp válido, por ejemplo +56 9 1234 5678." },
        { status: 400 }
      );
    }

    const db = getSupabaseClient();
    const { data, error } = await db.auth.admin.generateLink({
      type: "recovery",
      email: emailSinteticoDeTelefono(telefono),
      options: { redirectTo: `${req.nextUrl.origin}/restablecer-contrasena` },
    });

    // Cuenta inexistente: misma respuesta que si existiera.
    if (error || !data?.user || !data.properties?.action_link) {
      return NextResponse.json({ ok: true });
    }

    const meta = (data.user.app_metadata ?? {}) as Record<string, unknown>;
    const ultimo = typeof meta.recuperacion_enviada_en === "string" ? Date.parse(meta.recuperacion_enviada_en) : 0;
    if (Date.now() - ultimo < ESPERA_ENTRE_ENVIOS_MS) {
      return NextResponse.json({ ok: true });
    }
    await db.auth.admin.updateUserById(data.user.id, {
      app_metadata: { ...meta, recuperacion_enviada_en: new Date().toISOString() },
    });

    const link = data.properties.action_link;
    const { email: emailContacto } = contactoDeUsuarioAuth(data.user);
    const texto =
      `Hola 👋 Pediste recuperar tu acceso a Griyo. Toca este link para elegir una nueva contraseña (vale por 1 hora):\n\n${link}\n\n` +
      `Si no fuiste tú, ignora este mensaje.`;

    await Promise.all([
      enviarWhatsApp({
        to: telefono,
        texto,
        plantilla: {
          contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID_RECUPERACION,
          variables: { "1": link },
        },
      }),
      emailContacto
        ? enviarEmail({
            to: emailContacto,
            subject: "Recupera tu acceso a Griyo",
            html: `<p>Pediste recuperar tu acceso a Griyo.</p><p><a href="${link}">Elegir una nueva contraseña</a> (el link vale por 1 hora).</p><p>Si no fuiste tú, ignora este mensaje.</p>`,
          })
        : Promise.resolve(null),
    ]);

    // Solo en desarrollo local, sin WhatsApp configurado: devuelve el link
    // para poder probar el flujo sin Twilio. Nunca en producción.
    if (!esProduccion && !isWhatsAppConfigured()) {
      return NextResponse.json({ ok: true, enlaceDePrueba: link });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/recuperar]", err);
    return NextResponse.json({ error: "No pudimos enviar el link. Intenta de nuevo." }, { status: 500 });
  }
}
