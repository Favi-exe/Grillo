"use client";

import { obtenerAccessToken } from "./familiarSession";
import { obtenerTokenDispositivo } from "./deviceToken";

/** fetch con el JWT de Supabase del familiar en el header Authorization. */
export async function fetchFamiliar(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await obtenerAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

/**
 * fetch del lado del abuelo. Prueba primero el token de dispositivo
 * (tablet vinculada por un familiar); si no hay, usa su propia sesión de
 * Supabase (persona mayor que se registró sola en /registro-mayor). El
 * servidor (requireAbueloAccess) acepta cualquiera de las dos.
 */
export async function fetchAbuelo(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const deviceToken = obtenerTokenDispositivo();
  if (deviceToken) {
    headers.set("X-Device-Token", deviceToken);
  } else {
    const token = await obtenerAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...init, headers });
}
