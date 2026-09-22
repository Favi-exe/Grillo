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

export interface PushSubscriptionRow {
  id: string;
  abuelo_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
