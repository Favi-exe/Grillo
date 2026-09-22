"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAbuelo } from "@/lib/auth/fetchConAuth";

export type EstadoPush =
  | "verificando"
  | "no_soportado"
  | "inactivo"
  | "activando"
  | "activo"
  | "denegado"
  | "error";

// El navegador entrega la VAPID public key en base64url; PushManager.subscribe
// necesita un Uint8Array — conversión estándar, no hay forma más directa.
function base64UrlAUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Activa notificaciones push para el dispositivo actual (recordatorios que
 * llegan aunque el navegador esté cerrado). Requiere un gesto del usuario
 * (un click) para pedir el permiso — los navegadores bloquean pedirlo solo
 * al cargar la página.
 */
export function useSuscripcionPush() {
  const [estado, setEstado] = useState<EstadoPush>("verificando");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEstado("no_soportado");
      return;
    }
    if (Notification.permission === "denied") {
      setEstado("denegado");
      return;
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setEstado(sub ? "activo" : "inactivo");
    });
  }, []);

  const activar = useCallback(async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error("[push] falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      setEstado("error");
      return;
    }
    setEstado("activando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "denegado" : "inactivo");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlAUint8Array(vapidKey),
        }));

      const json = sub.toJSON();
      const res = await fetchAbuelo("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      });
      if (!res.ok) throw new Error("no se pudo guardar la suscripción");

      setEstado("activo");
    } catch (err) {
      console.error("[push] fallo activando notificaciones:", err);
      setEstado("error");
    }
  }, []);

  return { estado, activar };
}
