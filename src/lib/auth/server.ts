import type { NextRequest } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { getUsuarioByAuthId, getAbueloIdPorToken } from "@/lib/db";

/**
 * Autorización real de las rutas /api/*. Nada acá confía en un abueloId
 * que mande el cliente — siempre se resuelve del lado del servidor a
 * partir de una credencial verificable (el JWT de Supabase Auth para el
 * familiar, o el token de dispositivo para la tablet del abuelo).
 */
export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export interface ContextoFamiliar {
  authUserId: string;
  usuarioId: string;
  abueloId: string | null;
}

/**
 * Valida el Authorization: Bearer <token> de una sesión de Supabase Auth y
 * devuelve el usuario/abuelo vinculado. abueloId puede venir null si el
 * familiar todavía no creó ningún perfil de abuelo (recién registrado).
 */
export async function requireFamiliar(req: NextRequest): Promise<ContextoFamiliar> {
  if (!isSupabaseConfigured()) {
    throw new AuthError(
      "El login de familiares necesita Supabase conectado en este servidor.",
      503
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    throw new AuthError("Falta iniciar sesión.");
  }

  const { data, error } = await getSupabaseClient().auth.getUser(token);
  if (error || !data.user) {
    throw new AuthError("Sesión inválida o vencida.");
  }

  const usuario = await getUsuarioByAuthId(data.user.id);
  if (!usuario) {
    throw new AuthError("No encontramos un perfil para esta cuenta.", 404);
  }

  return {
    authUserId: data.user.id,
    usuarioId: usuario.id,
    abueloId: usuario.abuelo_id ?? null,
  };
}

/**
 * Igual que requireFamiliar pero no exige que ya exista una fila en
 * `usuarios` — se usa justo después del signup, antes de que el familiar
 * haya completado el onboarding (nombre, relación, abuelo).
 */
export async function requireSesionSupabase(
  req: NextRequest
): Promise<{ authUserId: string; email: string | null }> {
  if (!isSupabaseConfigured()) {
    throw new AuthError(
      "El login de familiares necesita Supabase conectado en este servidor.",
      503
    );
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new AuthError("Falta iniciar sesión.");

  const { data, error } = await getSupabaseClient().auth.getUser(token);
  if (error || !data.user) throw new AuthError("Sesión inválida o vencida.");

  return { authUserId: data.user.id, email: data.user.email ?? null };
}

/** Igual que requireFamiliar, pero exige que ya tenga un abuelo vinculado. */
export async function requireFamiliarConAbuelo(
  req: NextRequest
): Promise<ContextoFamiliar & { abueloId: string }> {
  const ctx = await requireFamiliar(req);
  if (!ctx.abueloId) {
    throw new AuthError("Todavía no creaste el perfil de tu familiar mayor.", 409);
  }
  return { ...ctx, abueloId: ctx.abueloId };
}

/**
 * Valida el token de dispositivo (header X-Device-Token) de la tablet del
 * abuelo y devuelve el abuelo_id al que está vinculado. Nunca vence.
 */
export async function requireAbueloDevice(req: NextRequest): Promise<{ abueloId: string }> {
  const token = req.headers.get("x-device-token");
  if (!token) {
    throw new AuthError("Este dispositivo no está vinculado a ninguna persona mayor.");
  }
  const abueloId = await getAbueloIdPorToken(token);
  if (!abueloId) {
    throw new AuthError("El token de este dispositivo ya no es válido.");
  }
  return { abueloId };
}

/**
 * Acceso del lado del abuelo, en cualquiera de las dos formas posibles:
 * (a) token de dispositivo vinculado por un familiar, o
 * (b) sesión propia de Supabase de una persona mayor que se registró sola
 *     (ver /api/registro-mayor) — un `usuarios` con rol "abuelo" y su
 *     propio auth_user_id. Se prueba primero el token (más común) y se cae
 *     a la sesión propia si no hay token.
 */
export async function requireAbueloAccess(req: NextRequest): Promise<{ abueloId: string }> {
  const deviceToken = req.headers.get("x-device-token");
  if (deviceToken) {
    const abueloId = await getAbueloIdPorToken(deviceToken);
    if (abueloId) return { abueloId };
  }

  if (isSupabaseConfigured()) {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
      const { data, error } = await getSupabaseClient().auth.getUser(token);
      if (!error && data.user) {
        const usuario = await getUsuarioByAuthId(data.user.id);
        if (usuario?.rol === "abuelo" && usuario.abuelo_id) {
          return { abueloId: usuario.abuelo_id };
        }
      }
    }
  }

  throw new AuthError("Este dispositivo no está vinculado a ninguna persona mayor.");
}
