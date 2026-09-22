import type { PushSubscriptionRow } from "@/lib/types";

/**
 * Envío de notificaciones push del lado del servidor (VAPID + web-push).
 * Import dinámico de "web-push" por el mismo motivo que el resto de las
 * integraciones opcionales del proyecto: si no está configurado, no debe
 * romper el build ni el arranque en modo mock.
 */

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

let configurado = false;
async function getWebPush() {
  const webpush = (await import("web-push")).default;
  if (!configurado) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    configurado = true;
  }
  return webpush;
}

export interface PayloadNotificacion {
  titulo: string;
  cuerpo: string;
  tag?: string;
  url?: string;
}

/**
 * Manda el push a todas las suscripciones dadas. Devuelve los endpoints que
 * respondieron 404/410 (suscripción vencida/desinstalada) para que quien
 * llama las pueda borrar — un endpoint muerto no es un error a loguear cada
 * vez, es limpieza normal de datos viejos.
 */
export async function enviarNotificacionATodas(
  subs: PushSubscriptionRow[],
  payload: PayloadNotificacion
): Promise<{ enviadas: number; vencidas: string[] }> {
  if (subs.length === 0) return { enviadas: 0, vencidas: [] };
  const webpush = await getWebPush();
  const body = JSON.stringify(payload);

  const vencidas: string[] = [];
  let enviadas = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        enviadas++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          vencidas.push(sub.endpoint);
        } else {
          console.error("[push] fallo enviando a", sub.endpoint, err);
        }
      }
    })
  );

  return { enviadas, vencidas };
}
