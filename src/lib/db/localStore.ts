import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  Usuario,
  Abuelo,
  Recordatorio,
  Memoria,
  Conversacion,
  AlertaEmergencia,
  AbueloDispositivo,
} from "@/lib/types";

interface DbShape {
  usuarios: Usuario[];
  abuelos: Abuelo[];
  recordatorios: Recordatorio[];
  memorias: Memoria[];
  conversaciones: Conversacion[];
  alertas_emergencia: AlertaEmergencia[];
  abuelo_dispositivos: AbueloDispositivo[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// Sin datos de ejemplo: el modo local arranca vacío, igual que Supabase.
// Nota: el login real (email+contraseña) necesita Supabase Auth — en modo
// local solo sirve para probar el resto de los flujos con datos propios.
function vacio(): DbShape {
  return {
    usuarios: [],
    abuelos: [],
    recordatorios: [],
    memorias: [],
    conversaciones: [],
    alertas_emergencia: [],
    abuelo_dispositivos: [],
  };
}

function ensureDb(): DbShape {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = vacio();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    // Compatibilidad con db.json generados antes de sumar estas colecciones.
    if (!parsed.alertas_emergencia) parsed.alertas_emergencia = [];
    if (!parsed.abuelo_dispositivos) parsed.abuelo_dispositivos = [];
    return parsed as DbShape;
  } catch {
    const initial = vacio();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
}

function save(db: DbShape) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export const localStore = {
  // --- Usuarios ---
  listUsuarios(): Usuario[] {
    return ensureDb().usuarios;
  },
  getUsuario(id: string): Usuario | undefined {
    return ensureDb().usuarios.find((u) => u.id === id);
  },
  listFamiliaresDeAbuelo(abueloId: string): Usuario[] {
    return ensureDb().usuarios.filter((u) => u.abuelo_id === abueloId && u.rol === "familiar");
  },
  getUsuarioByAuthId(authUserId: string): Usuario | undefined {
    return ensureDb().usuarios.find((u) => u.auth_user_id === authUserId);
  },
  createUsuario(input: Omit<Usuario, "id" | "created_at">): Usuario {
    const db = ensureDb();
    const nuevo: Usuario = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
    db.usuarios.push(nuevo);
    save(db);
    return nuevo;
  },
  updateUsuario(id: string, patch: Partial<Usuario>): Usuario | undefined {
    const db = ensureDb();
    const idx = db.usuarios.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    db.usuarios[idx] = { ...db.usuarios[idx], ...patch };
    save(db);
    return db.usuarios[idx];
  },

  // --- Abuelos ---
  listAbuelos(): Abuelo[] {
    return ensureDb().abuelos;
  },
  getAbuelo(id: string): Abuelo | undefined {
    return ensureDb().abuelos.find((a) => a.id === id);
  },
  createAbuelo(input: Omit<Abuelo, "id" | "created_at">): Abuelo {
    const db = ensureDb();
    const nuevo: Abuelo = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
    db.abuelos.push(nuevo);
    save(db);
    return nuevo;
  },

  // --- Recordatorios ---
  listRecordatorios(abueloId: string): Recordatorio[] {
    return ensureDb()
      .recordatorios.filter((r) => r.abuelo_id === abueloId)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  },
  createRecordatorio(input: Omit<Recordatorio, "id" | "created_at">): Recordatorio {
    const db = ensureDb();
    const nuevo: Recordatorio = {
      ...input,
      id: randomUUID(),
      created_at: new Date().toISOString(),
    };
    db.recordatorios.push(nuevo);
    save(db);
    return nuevo;
  },
  updateRecordatorio(id: string, patch: Partial<Recordatorio>): Recordatorio | undefined {
    const db = ensureDb();
    const idx = db.recordatorios.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    db.recordatorios[idx] = { ...db.recordatorios[idx], ...patch };
    save(db);
    return db.recordatorios[idx];
  },
  deleteRecordatorio(id: string): boolean {
    const db = ensureDb();
    const before = db.recordatorios.length;
    db.recordatorios = db.recordatorios.filter((r) => r.id !== id);
    save(db);
    return db.recordatorios.length < before;
  },

  // --- Memorias ---
  listMemorias(abueloId: string): Memoria[] {
    return ensureDb()
      .memorias.filter((m) => m.abuelo_id === abueloId)
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  },
  createMemoria(input: Omit<Memoria, "id">): Memoria {
    const db = ensureDb();
    const nueva: Memoria = { ...input, id: randomUUID() };
    db.memorias.push(nueva);
    save(db);
    return nueva;
  },

  // --- Conversaciones ---
  createConversacion(input: Omit<Conversacion, "id">): Conversacion {
    const db = ensureDb();
    const nueva: Conversacion = { ...input, id: randomUUID() };
    db.conversaciones.push(nueva);
    save(db);
    return nueva;
  },
  listConversaciones(abueloId: string): Conversacion[] {
    return ensureDb().conversaciones.filter((c) => c.abuelo_id === abueloId);
  },
  contarConversacionesDesde(abueloId: string, desde: string): number {
    return ensureDb().conversaciones.filter(
      (c) => c.abuelo_id === abueloId && c.fecha >= desde
    ).length;
  },

  // --- Alertas de emergencia ---
  crearAlertaEmergencia(abueloId: string): AlertaEmergencia {
    const db = ensureDb();
    const nueva: AlertaEmergencia = {
      id: randomUUID(),
      abuelo_id: abueloId,
      estado: "activa",
      fecha: new Date().toISOString(),
      fecha_resuelta: null,
    };
    db.alertas_emergencia.push(nueva);
    save(db);
    return nueva;
  },
  listAlertasEmergencia(abueloId: string): AlertaEmergencia[] {
    return ensureDb()
      .alertas_emergencia.filter((a) => a.abuelo_id === abueloId)
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  },
  resolverAlertaEmergencia(id: string): AlertaEmergencia | undefined {
    const db = ensureDb();
    const idx = db.alertas_emergencia.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    db.alertas_emergencia[idx] = {
      ...db.alertas_emergencia[idx],
      estado: "resuelta",
      fecha_resuelta: new Date().toISOString(),
    };
    save(db);
    return db.alertas_emergencia[idx];
  },

  // --- Dispositivos del abuelo (login persistente sin contraseña) ---
  crearDispositivo(input: {
    abueloId: string;
    nombreDispositivo?: string | null;
    creadoPor?: string | null;
  }): AbueloDispositivo {
    const db = ensureDb();
    const nuevo: AbueloDispositivo = {
      id: randomUUID(),
      abuelo_id: input.abueloId,
      token: randomUUID() + randomUUID(), // token largo, no adivinable
      nombre_dispositivo: input.nombreDispositivo ?? null,
      creado_por: input.creadoPor ?? null,
      created_at: new Date().toISOString(),
      ultimo_acceso: null,
    };
    db.abuelo_dispositivos.push(nuevo);
    save(db);
    return nuevo;
  },
  getAbueloIdPorToken(token: string): string | undefined {
    const db = ensureDb();
    const idx = db.abuelo_dispositivos.findIndex((d) => d.token === token);
    if (idx === -1) return undefined;
    db.abuelo_dispositivos[idx] = {
      ...db.abuelo_dispositivos[idx],
      ultimo_acceso: new Date().toISOString(),
    };
    save(db);
    return db.abuelo_dispositivos[idx].abuelo_id;
  },
  listDispositivos(abueloId: string): AbueloDispositivo[] {
    return ensureDb().abuelo_dispositivos.filter((d) => d.abuelo_id === abueloId);
  },
  eliminarDispositivo(id: string): boolean {
    const db = ensureDb();
    const before = db.abuelo_dispositivos.length;
    db.abuelo_dispositivos = db.abuelo_dispositivos.filter((d) => d.id !== id);
    save(db);
    return db.abuelo_dispositivos.length < before;
  },
};
