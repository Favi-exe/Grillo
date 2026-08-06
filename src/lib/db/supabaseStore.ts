import { randomUUID } from "crypto";
import { getSupabaseClient } from "./supabaseClient";
import type {
  Usuario,
  Abuelo,
  Recordatorio,
  Memoria,
  Conversacion,
  AlertaEmergencia,
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
};
