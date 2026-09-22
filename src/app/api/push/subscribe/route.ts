import { NextRequest, NextResponse } from "next/server";
import {
  guardarPushSubscription,
  eliminarPushSubscriptionPorEndpoint,
} from "@/lib/db";
import { AuthError, requireAbueloAccess, requireFamiliarConAbuelo } from "@/lib/auth/server";

// Guarda (o actualiza) la suscripción push del dispositivo actual — se llama
// desde el navegador después de que el usuario acepta el permiso de
// notificaciones. Acepta tanto el dispositivo del abuelo como la sesión de
// un familiar, igual que /api/recordatorios.
export async function POST(req: NextRequest) {
  try {
    let abueloId: string;
    try {
      ({ abueloId } = await requireAbueloAccess(req));
    } catch {
      ({ abueloId } = await requireFamiliarConAbuelo(req));
    }

    const body = await req.json();
    const { endpoint, keys } = body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Suscripción incompleta" }, { status: 400 });
    }

    const guardada = await guardarPushSubscription({
      abueloId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    return NextResponse.json({ suscripcion: guardada });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/push/subscribe POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// El navegador manda esto cuando el usuario apaga las notificaciones (o
// cuando push.unsubscribe() se llama por cualquier otro motivo).
export async function DELETE(req: NextRequest) {
  try {
    try {
      await requireAbueloAccess(req);
    } catch {
      await requireFamiliarConAbuelo(req);
    }

    const body = await req.json();
    const { endpoint } = body as { endpoint?: string };
    if (!endpoint) {
      return NextResponse.json({ error: "Falta el endpoint" }, { status: 400 });
    }

    await eliminarPushSubscriptionPorEndpoint(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/push/subscribe DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
