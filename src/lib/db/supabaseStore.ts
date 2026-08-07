import { randomUUID } from "crypto";
import { getSupabaseClient } from "./supabaseClient";
import type {
  Usuario,
  Abuelo,
  Recordatorio,
  Memoria,
  Conversacion,
  AlertaEmergencia,
  AbueloDispositivo,
} from "@/lib/types";

export const supabaseStore = {
  async listUsuarios(): Promise<Usuario[]> {
    const { data, error } = await getSupabaseClient().from("usuarios").select("*");
    if (error) throw error;
    return data as Usuario[];
  },
  async getUsuario(id: string): Promise<Usuario | undefined> {
    const { data, error } = await getSupabaseClient()
      .from("usuarios")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as Usuario) ?? undefined;
  },
  async getUsuarioByAuthId(authUserId: string): Promise<Usuario | undefined> {
    const { data, error } = await getSupabaseClient()
      .from("usuarios")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error) throw error;
    return (data as Usuario) ?? undefined;
  },
  async createUsuario(input: Omit<Usuario, "id" | "created_at">): Promise<Usuario> {
    const nuevo = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
    const { data, error } = await getSupabaseClient()
      .from("usuarios")
      .insert(nuevo)
      .select()
      .single();
    if (error) throw error;
    return data as Usuario;
  },
  async updateUsuario(id: string, patch: Partial<Usuario>): Promise<Usuario | undefined> {
    const { data, error } = await getSupabaseClient()
      .from("usuarios")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return (data as Usuario) ?? undefined;
  },

  async listAbuelos(): Promise<Abuelo[]> {
    const { data, error } = await getSupabaseClient().from("abuelos").select("*");
    if (error) throw error;
    return data as Abuelo[];
  },
  async getAbuelo(id: string): Promise<Abuelo | undefined> {
    const { data, error } = await getSupabaseClient()
      .from("abuelos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as Abuelo) ?? undefined;
  },
  async createAbuelo(input: Omit<Abuelo, "id" | "created_at">): Promise<Abuelo> {
    const nuevo = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
    const { data, error } = await getSupabaseClient()
      .from("abuelos")
      .insert(nuevo)
      .select()
      .single();
    if (error) throw error;
    return data as Abuelo;
  },

  async listRecordatorios(abueloId: string): Promise<Recordatorio[]> {
    const { data, error } = await getSupabaseClient()
      .from("recordatorios")
      .select("*")
      .eq("abuelo_id", abueloId)
      .order("hora", { ascending: true });
    if (error) throw error;
    return data as Recordatorio[];
  },
  async createRecordatorio(
    input: Omit<Recordatorio, "id" | "created_at">
  ): Promise<Recordatorio> {
    const nuevo = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
    const { data, error } = await getSupabaseClient()
      .from("recordatorios")
      .insert(nuevo)
      .select()
      .single();
    if (error) throw error;
    return data as Recordatorio;
  },
  async updateRecordatorio(
    id: string,
    patch: Partial<Recordatorio>
  ): Promise<Recordatorio | undefined> {
    const { data, error } = await getSupabaseClient()
      .from("recordatorios")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return (data as Recordatorio) ?? undefined;
  },
  async deleteRecordatorio(id: string): Promise<boolean> {
    const { error } = await getSupabaseClient().from("recordatorios").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  async listMemorias(abueloId: string): Promise<Memoria[]> {
    const { data, error } = await getSupabaseClient()
      .from("memorias")
      .select("*")
      .eq("abuelo_id", abueloId)
      .order("fecha", { ascending: false });
    if (error) throw error;
    return data as Memoria[];
  },
  async createMemoria(input: Omit<Memoria, "id">): Promise<Memoria> {
    const nueva = { ...input, id: randomUUID() };
    const { data, error } = await getSupabaseClient()
      .from("memorias")
      .insert(nueva)
      .select()
      .single();
    if (error) throw error;
    return data as Memoria;
  },

  async createConversacion(input: Omit<Conversacion, "id">): Promise<Conversacion> {
    const nueva = { ...input, id: randomUUID() };
    const { data, error } = await getSupabaseClient()
      .from("conversaciones")
      .insert(nueva)
      .select()
      .single();
    if (error) throw error;
    return data as Conversacion;
  },
  async listConversaciones(abueloId: string): Promise<Conversacion[]> {
    const { data, error } = await getSupabaseClient()
      .from("conversaciones")
      .select("*")
      .eq("abuelo_id", abueloId);
    if (error) throw error;
    return data as Conversacion[];
  },

  async crearAlertaEmergencia(abueloId: string): Promise<AlertaEmergencia> {
    const nueva = {
      id: randomUUID(),
      abuelo_id: abueloId,
      estado: "activa" as const,
      fecha: new Date().toISOString(),
      fecha_resuelta: null,
    };
    const { data, error } = await getSupabaseClient()
      .from("alertas_emergencia")
      .insert(nueva)
      .select()
      .single();
    if (error) throw error;
    return data as AlertaEmergencia;
  },
  async listAlertasEmergencia(abueloId: string): Promise<AlertaEmergencia[]> {
    const { data, error } = await getSupabaseClient()
      .from("alertas_emergencia")
      .select("*")
      .eq("abuelo_id", abueloId)
      .order("fecha", { ascending: false });
    if (error) throw error;
    return data as AlertaEmergencia[];
  },
  async resolverAlertaEmergencia(id: string): Promise<AlertaEmergencia | undefined> {
    const { data, error } = await getSupabaseClient()
      .from("alertas_emergencia")
      .update({ estado: "resuelta", fecha_resuelta: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return (data as AlertaEmergencia) ?? undefined;
  },

  async crearDispositivo(input: {
    abueloId: string;
    nombreDispositivo?: string | null;
    creadoPor?: string | null;
  }): Promise<AbueloDispositivo> {
    const nuevo = {
      id: randomUUID(),
      abuelo_id: input.abueloId,
      token: randomUUID() + randomUUID(),
      nombre_dispositivo: input.nombreDispositivo ?? null,
      creado_por: input.creadoPor ?? null,
      created_at: new Date().toISOString(),
      ultimo_acceso: null,
    };
    const { data, error } = await getSupabaseClient()
      .from("abuelo_dispositivos")
      .insert(nuevo)
      .select()
      .single();
    if (error) throw error;
    return data as AbueloDispositivo;
  },
  async getAbueloIdPorToken(token: string): Promise<string | undefined> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("abuelo_dispositivos")
      .select("id, abuelo_id")
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    await client
      .from("abuelo_dispositivos")
      .update({ ultimo_acceso: new Date().toISOString() })
      .eq("id", data.id);
    return data.abuelo_id as string;
  },
  async listDispositivos(abueloId: string): Promise<AbueloDispositivo[]> {
    const { data, error } = await getSupabaseClient()
      .from("abuelo_dispositivos")
      .select("*")
      .eq("abuelo_id", abueloId);
    if (error) throw error;
    return data as AbueloDispositivo[];
  },
  async eliminarDispositivo(id: string): Promise<boolean> {
    const { error } = await getSupabaseClient().from("abuelo_dispositivos").delete().eq("id", id);
    if (error) throw error;
    return true;
  },
};
