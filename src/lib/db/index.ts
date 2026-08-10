import { isSupabaseConfigured } from "./supabaseClient";
import { localStore } from "./localStore";
import { supabaseStore } from "./supabaseStore";
import type {
  Usuario,
  Abuelo,
  Recordatorio,
  Memoria,
  Conversacion,
  AlertaEmergencia,
  AbueloDispositivo,
} from "@/lib/types";

/**
 * Capa única de acceso a datos. Si Supabase está configurado (env vars presentes)
 * usa Postgres real; si no, cae a un store local en /data/db.json.
 * Todo el resto de la app llama SIEMPRE a estas funciones, nunca a los stores directamente.
 */

export function usandoSupabase(): boolean {
  return isSupabaseConfigured();
}

export async function listUsuarios(): Promise<Usuario[]> {
  return usandoSupabase() ? supabaseStore.listUsuarios() : localStore.listUsuarios();
}
export async function getUsuario(id: string): Promise<Usuario | undefined> {
  return usandoSupabase() ? supabaseStore.getUsuario(id) : localStore.getUsuario(id);
}
export async function listFamiliaresDeAbuelo(abueloId: string): Promise<Usuario[]> {
  return usandoSupabase()
    ? supabaseStore.listFamiliaresDeAbuelo(abueloId)
    : localStore.listFamiliaresDeAbuelo(abueloId);
}
export async function getUsuarioByAuthId(authUserId: string): Promise<Usuario | undefined> {
  return usandoSupabase()
    ? supabaseStore.getUsuarioByAuthId(authUserId)
    : localStore.getUsuarioByAuthId(authUserId);
}
export async function createUsuario(input: Omit<Usuario, "id" | "created_at">): Promise<Usuario> {
  return usandoSupabase() ? supabaseStore.createUsuario(input) : localStore.createUsuario(input);
}
export async function updateUsuario(
  id: string,
  patch: Partial<Usuario>
): Promise<Usuario | undefined> {
  return usandoSupabase()
    ? supabaseStore.updateUsuario(id, patch)
    : localStore.updateUsuario(id, patch);
}

export async function listAbuelos(): Promise<Abuelo[]> {
  return usandoSupabase() ? supabaseStore.listAbuelos() : localStore.listAbuelos();
}
export async function getAbuelo(id: string): Promise<Abuelo | undefined> {
  return usandoSupabase() ? supabaseStore.getAbuelo(id) : localStore.getAbuelo(id);
}
export async function createAbuelo(input: Omit<Abuelo, "id" | "created_at">): Promise<Abuelo> {
  return usandoSupabase() ? supabaseStore.createAbuelo(input) : localStore.createAbuelo(input);
}

export async function listRecordatorios(abueloId: string): Promise<Recordatorio[]> {
  return usandoSupabase()
    ? supabaseStore.listRecordatorios(abueloId)
    : localStore.listRecordatorios(abueloId);
}
export async function createRecordatorio(
  input: Omit<Recordatorio, "id" | "created_at">
): Promise<Recordatorio> {
  return usandoSupabase()
    ? supabaseStore.createRecordatorio(input)
    : localStore.createRecordatorio(input);
}
export async function updateRecordatorio(
  id: string,
  patch: Partial<Recordatorio>
): Promise<Recordatorio | undefined> {
  return usandoSupabase()
    ? supabaseStore.updateRecordatorio(id, patch)
    : localStore.updateRecordatorio(id, patch);
}
export async function deleteRecordatorio(id: string): Promise<boolean> {
  return usandoSupabase()
    ? supabaseStore.deleteRecordatorio(id)
    : localStore.deleteRecordatorio(id);
}

export async function listMemorias(abueloId: string): Promise<Memoria[]> {
  return usandoSupabase() ? supabaseStore.listMemorias(abueloId) : localStore.listMemorias(abueloId);
}
export async function createMemoria(input: Omit<Memoria, "id">): Promise<Memoria> {
  return usandoSupabase() ? supabaseStore.createMemoria(input) : localStore.createMemoria(input);
}

export async function createConversacion(
  input: Omit<Conversacion, "id">
): Promise<Conversacion> {
  return usandoSupabase()
    ? supabaseStore.createConversacion(input)
    : localStore.createConversacion(input);
}
export async function listConversaciones(abueloId: string): Promise<Conversacion[]> {
  return usandoSupabase()
    ? supabaseStore.listConversaciones(abueloId)
    : localStore.listConversaciones(abueloId);
}

export async function crearAlertaEmergencia(abueloId: string): Promise<AlertaEmergencia> {
  return usandoSupabase()
    ? supabaseStore.crearAlertaEmergencia(abueloId)
    : localStore.crearAlertaEmergencia(abueloId);
}
export async function listAlertasEmergencia(abueloId: string): Promise<AlertaEmergencia[]> {
  return usandoSupabase()
    ? supabaseStore.listAlertasEmergencia(abueloId)
    : localStore.listAlertasEmergencia(abueloId);
}
export async function resolverAlertaEmergencia(id: string): Promise<AlertaEmergencia | undefined> {
  return usandoSupabase()
    ? supabaseStore.resolverAlertaEmergencia(id)
    : localStore.resolverAlertaEmergencia(id);
}

export async function crearDispositivo(input: {
  abueloId: string;
  nombreDispositivo?: string | null;
  creadoPor?: string | null;
}): Promise<AbueloDispositivo> {
  return usandoSupabase() ? supabaseStore.crearDispositivo(input) : localStore.crearDispositivo(input);
}
export async function getAbueloIdPorToken(token: string): Promise<string | undefined> {
  return usandoSupabase()
    ? supabaseStore.getAbueloIdPorToken(token)
    : localStore.getAbueloIdPorToken(token);
}
export async function listDispositivos(abueloId: string): Promise<AbueloDispositivo[]> {
  return usandoSupabase()
    ? supabaseStore.listDispositivos(abueloId)
    : localStore.listDispositivos(abueloId);
}
export async function eliminarDispositivo(id: string): Promise<boolean> {
  return usandoSupabase() ? supabaseStore.eliminarDispositivo(id) : localStore.eliminarDispositivo(id);
}
