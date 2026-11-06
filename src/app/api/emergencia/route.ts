import { NextRequest, NextResponse } from "next/server";
import { crearAlertaEmergencia, listAlertasEmergencia, listFamiliaresDeAbuelo, getAbuelo } from "@/lib/db";
import { AuthError, requireAbueloAccess, requireFamiliarConAbuelo } from "@/lib/auth/server";
import { isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { notificarUsuario } from "@/lib/notify/contacto";

// La familia consulta el estado (¿hay alguna alerta activa?) y también el
// propio dispositivo del abuelo, al cargar, para saber si ya la disparó.
export async function GET(req: NextRequest) {
  try {
    let abueloId: string;
    try {
      ({ abueloId } = await requireAbueloAccess(req));
    } catch {
      ({ abueloId } = await requireFamiliarConAbuelo(req));
    }

    const alertas = await listAlertasEmergencia(abueloId);
    return NextResponse.json({ alertas });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/emergencia GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Le avisa a cada familiar vinculado al abuelo, por correo y/o WhatsApp según
// lo que haya dado al registrarse. Antes, "avisar a la familia" solo escribía
// una fila en la base y dependía de que alguien tuviera la vista familiar
// abierta en el navegador (poll cada 8s) — si nadie la tenía abierta, nadie
// se enteraba nunca. Sin credenciales de Resend/Twilio queda logueado (mock).
async function notificarFamilia(abueloId: string) {
  if (!isSupabaseConfigured()) return;

  const [abuelo, familiares] = await Promise.all([
    getAbuelo(abueloId),
    listFamiliaresDeAbuelo(abueloId),
  ]);
  if (familiares.length === 0) return;

  const nombre = abuelo?.nombre ?? "Tu familiar";
  const hora = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

  await Promise.all(
    familiares.map(async (familiar) => {
      if (!familiar.auth_user_id) return;
      await notificarUsuario(familiar.auth_user_id, {
        asunto: `🚨 ${nombre} pidió ayuda a través de Griyo`,
        html: `<p><strong>${nombre}</strong> tocó el botón de emergencia en Griyo (${hora}).</p><p>Contáctalo/a ahora para asegurarte de que esté bien.</p>`,
        texto: `🚨 ${nombre} tocó el botón de emergencia en Griyo (${hora}). Contáctalo/a ahora para asegurarte de que esté bien.`,
        plantillaWhatsApp: {
          contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID_EMERGENCIA,
          variables: { "1": nombre, "2": hora },
        },
      });
    })
  );
}

// Solo el dispositivo del abuelo puede disparar una alerta — la familia la
// recibe, nunca la genera ella misma (ver AlertasFamiliar.tsx).
export async function POST(req: NextRequest) {
  try {
    const { abueloId } = await requireAbueloAccess(req);
    const alerta = await crearAlertaEmergencia(abueloId);

    try {
      await notificarFamilia(abueloId);
    } catch (err) {
      console.error("[api/emergencia] fallo notificando a la familia:", err);
    }

    return NextResponse.json({ alerta }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/emergencia POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
