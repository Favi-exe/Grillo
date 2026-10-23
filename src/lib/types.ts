export type Rol = "abuelo" | "familiar";

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  relacion_con_abuelo?: string | null;
  abuelo_id?: string | null;
  auth_user_id?: string | null;
  created_at: string;
}

export interface Abuelo {
  id: string;
  nombre: string;
  fecha_nacimiento?: string | null;
  notas_generales?: string | null;
  created_at: string;
}

export type TipoRecordatorio = "medicamento" | "agua" | "cita" | "evento" | "otro";

export interface Recordatorio {
  id: string;
  abuelo_id: string;
  tipo: TipoRecordatorio;
  descripcion: string;
  hora: string; // "HH:MM" formato 24h
  // Fecha calendario ("YYYY-MM-DD") para un recordatorio de un día puntual,
  // ej. "el martes 22 a las 13:30". null/undefined = sin día fijo: dispara
  // la próxima vez que la hora coincida (uso típico de "diario"/"semanal").
  // Para "una_vez" siempre debería venir con fecha (Griyo la completa sola
  // con el día de hoy si la persona no especificó uno) — ver definitions.ts.
  fecha?: string | null;
  frecuencia: "una_vez" | "diario" | "semanal";
  creado_por: string; // usuario id o "griyo"
  activo: boolean;
  created_at: string;
  ultima_notificacion?: string | null;
}

export interface Memoria {
  id: string;
  abuelo_id: string;
  resumen: string;
  transcripcion_original: string;
  tema: string;
  personas_mencionadas: string[];
  emocion_detectada: string;
  fecha: string;
  embedding_id_pinecone?: string | null;
}

export interface Conversacion {
  id: string;
  abuelo_id: string;
  fecha: string;
  transcripcion_completa: ChatMessage[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ClimaInfo {
  ciudad: string;
  temperatura: number;
  descripcion: string;
  sensacion_termica?: number;
  fuente: "mock" | "real";
}

export interface AlertaEmergencia {
  id: string;
  abuelo_id: string;
  estado: "activa" | "resuelta";
  fecha: string;
  fecha_resuelta?: string | null;
}

export interface AlertaAnimo {
  id: string;
  abuelo_id: string;
  fecha: string;
  resumen: string;
}

export interface RegistroAnimo {
  id: string;
  abuelo_id: string;
  valencia: number; // 1 (terrible) a 5 (excelente)
  fecha: string;
}

export interface AbueloDispositivo {
  id: string;
  abuelo_id: string;
  token: string;
  nombre_dispositivo?: string | null;
  creado_por?: string | null;
  created_at: string;
  ultimo_acceso?: string | null;
}

// Foto que se suma al libro de Legado Vivo. El archivo vive en el storage
// (Supabase Storage o disco local en modo mock); acá solo queda la ruta.
export interface Foto {
  id: string;
  abuelo_id: string;
  storage_path: string;
  descripcion?: string | null;
  subida_por_rol: "abuelo" | "familiar";
  subida_por_nombre?: string | null;
  created_at: string;
}

// Pregunta que un familiar deja armada para que Griyo se la muestre a la
// persona mayor (tarjeta en /abuelo y, con naturalidad, dentro de la charla).
export interface PreguntaFamilia {
  id: string;
  abuelo_id: string;
  texto: string;
  autor_nombre: string;
  creada_por?: string | null;
  estado: "pendiente" | "respondida";
  created_at: string;
  respondida_at?: string | null;
}

export interface PushSubscriptionRow {
  id: string;
  abuelo_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

// Plan de una familia, que el administrador registra a mano desde /admin (no
// hay cobro automático todavía). Una por persona mayor.
export type EstadoSuscripcion = "piloto" | "prueba" | "activa" | "pausada" | "cancelada";

export interface Suscripcion {
  id: string;
  abuelo_id: string;
  plan: string;
  estado: EstadoSuscripcion;
  precio_clp: number;
  inicio?: string | null; // "YYYY-MM-DD"
  proximo_cobro?: string | null; // "YYYY-MM-DD"
  notas?: string | null;
  updated_at: string;
}

// Aviso diario que invita a la persona mayor a conversar. Sin fila en la base
// se usan los valores por defecto (ver PREFERENCIA_CHARLA_POR_DEFECTO).
export interface PreferenciaCharla {
  abuelo_id: string;
  hora: string; // "HH:MM" hora de Chile
  activo: boolean;
  ultimo_aviso?: string | null;
  ultimo_aviso_familia?: string | null;
  updated_at: string;
}

export const HORA_CHARLA_POR_DEFECTO = "11:00";

// Una cuenta que aceptó los términos y la política de privacidad.
export interface Consentimiento {
  id: string;
  auth_user_id: string;
  version: string;
  aceptado_en: string;
}
