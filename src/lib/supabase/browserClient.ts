"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Cliente de Supabase para el navegador — solo se usa para Auth (signUp,
 * signInWithPassword, signOut, sesión actual). Usa la key "publishable"
 * (segura para exponer al cliente); nunca se usa para leer/escribir tablas
 * directo, eso siempre pasa por nuestras rutas /api/* con la service key.
 */
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseAuthConfigured()) {
    throw new Error(
      "El login necesita Supabase conectado (faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );
  }
  return client;
}
