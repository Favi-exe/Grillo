"use client";

// Token persistente del dispositivo del abuelo — se guarda una sola vez
// (ver /familia → "vincular este dispositivo") y no vence nunca. Es
// completamente independiente de la sesión de Supabase Auth del familiar.
const KEY = "grillo_device_token";

export function guardarTokenDispositivo(token: string) {
  localStorage.setItem(KEY, token);
}

export function obtenerTokenDispositivo(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function borrarTokenDispositivo() {
  localStorage.removeItem(KEY);
}
