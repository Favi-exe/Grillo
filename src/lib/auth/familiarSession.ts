"use client";

import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/browserClient";

export { isSupabaseAuthConfigured };

export async function registrarFamiliar(email: string, password: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.signUp({
    email,
    password,
    options: {
      // A dónde vuelve el link de confirmación del email — directo a
      // /familia, que ya sabe seguir el onboarding (perfil → abuelo).
      emailRedirectTo:
        typeof window !== "undefined" ? `${window.location.origin}/familia` : undefined,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Inicia sesión con email+contraseña. El nombre quedó "Familiar" de cuando
 * solo existía ese login, pero es el mismo signInWithPassword de Supabase
 * que usa también la persona mayor que se registró sola (ver
 * /registro-mayor) — establece la sesión persistente en este navegador.
 */
export async function iniciarSesionFamiliar(email: string, password: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export const iniciarSesion = iniciarSesionFamiliar;

export async function cerrarSesionFamiliar() {
  await getSupabaseBrowserClient().auth.signOut();
}

/**
 * Manda el mail de recuperación de contraseña de Supabase. Sirve tanto
 * para un familiar como para una persona mayor que perdió el acceso a su
 * dispositivo (perdió la sesión persistente) — ver /recuperar-cuenta.
 */
export async function solicitarRecuperacion(email: string) {
  const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
    redirectTo:
      typeof window !== "undefined" ? `${window.location.origin}/restablecer-contrasena` : undefined,
  });
  if (error) throw error;
}

/** Setea una contraseña nueva — se usa con la sesión temporal que deja el link de recuperación o de invitación. */
export async function actualizarContrasena(nuevaPassword: string) {
  const { error } = await getSupabaseBrowserClient().auth.updateUser({ password: nuevaPassword });
  if (error) throw error;
}

/** Nombre y relación con la persona mayor que pueda venir en la invitación (ver /api/invitaciones). */
export async function obtenerMetadataUsuarioActual(): Promise<Record<string, unknown> | null> {
  const { data } = await getSupabaseBrowserClient().auth.getUser();
  return data.user?.user_metadata ?? null;
}

export async function obtenerAccessToken(): Promise<string | null> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  return data.session?.access_token ?? null;
}

/** true si hay una sesión de Supabase activa ahora mismo (sin esperar el evento). */
export async function haySesionActiva(): Promise<boolean> {
  return Boolean(await obtenerAccessToken());
}

/** Se dispara con cada cambio de sesión (login, logout, refresh de token). */
export function suscribirseACambiosDeSesion(callback: (sesionActiva: boolean) => void) {
  const {
    data: { subscription },
  } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
    callback(Boolean(session));
  });
  return () => subscription.unsubscribe();
}
