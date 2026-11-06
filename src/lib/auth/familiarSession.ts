"use client";

import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "@/lib/supabase/browserClient";
import { resolverIdentificador } from "@/lib/auth/telefono";

export { isSupabaseAuthConfigured };

/**
 * Crea la cuenta con número de WhatsApp/teléfono (el correo es opcional) y
 * deja la sesión iniciada en este navegador. El alta se hace del lado del
 * servidor, ya confirmada: no hay un correo de confirmación que esperar.
 */
export async function registrarConTelefono(params: {
  telefono: string;
  password: string;
  email?: string;
}) {
  const res = await fetch("/api/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No pudimos crear la cuenta.");
  return iniciarSesionConIdentificador(data.telefono, params.password);
}

/**
 * Inicia sesión con lo que la persona escriba en "WhatsApp o correo". Sirve
 * igual para un familiar y para la persona mayor que se registró sola (ver
 * /registro-mayor) — establece la sesión persistente en este navegador. Las
 * cuentas antiguas, creadas con correo, siguen entrando con su correo.
 */
export async function iniciarSesionConIdentificador(identificador: string, password: string) {
  const resuelto = resolverIdentificador(identificador);
  if (!resuelto) {
    throw new Error("Escribe tu número de WhatsApp (ej. +56 9 1234 5678) o tu correo.");
  }
  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({
    email: resuelto.email,
    password,
  });
  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      throw new Error("El número (o correo) o la contraseña no coinciden. Revisa e intenta de nuevo.");
    }
    throw error;
  }
  return data;
}

export async function cerrarSesionFamiliar() {
  await getSupabaseBrowserClient().auth.signOut();
}

/**
 * Recuperación de contraseña. Con un número, el servidor manda el link por
 * WhatsApp (ver /api/recuperar); con un correo (cuentas antiguas), Supabase
 * manda el mail. Sirve tanto para un familiar como para una persona mayor
 * que perdió el acceso a su dispositivo (perdió la sesión persistente) —
 * ver /recuperar-cuenta. Devuelve por qué canal salió el link.
 */
export async function solicitarRecuperacion(identificador: string): Promise<"whatsapp" | "correo"> {
  const resuelto = resolverIdentificador(identificador);
  if (!resuelto) {
    throw new Error("Escribe tu número de WhatsApp (ej. +56 9 1234 5678) o tu correo.");
  }

  if (resuelto.tipo === "email") {
    const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(resuelto.email, {
      redirectTo:
        typeof window !== "undefined" ? `${window.location.origin}/restablecer-contrasena` : undefined,
    });
    if (error) throw error;
    return "correo";
  }

  const res = await fetch("/api/recuperar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefono: resuelto.telefono }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No pudimos enviar el link.");
  // Solo en desarrollo local sin WhatsApp configurado: permite probar el flujo.
  if (data.enlaceDePrueba) console.info("[recuperar] link de prueba (solo desarrollo):", data.enlaceDePrueba);
  return "whatsapp";
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
