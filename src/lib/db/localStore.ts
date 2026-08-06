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
} from "@/lib/types";

interface DbShape {
  usuarios: Usuario[];
  abuelos: Abuelo[];
  recordatorios: Recordatorio[];
  memorias: Memoria[];
  conversaciones: Conversacion[];
  alertas_emergencia: AlertaEmergencia[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function seed(): DbShape {
  const abueloId = "abuelo-demo-1";
  const familiarId = "familiar-demo-1";
  const now = new Date().toISOString();

  return {
    usuarios: [
      {
        id: "abuelo-user-1",
        nombre: "Don Carlos",
        rol: "abuelo",
        relacion_con_abuelo: null,
        abuelo_id: abueloId,
        created_at: now,
      },
      {
        id: familiarId,
        nombre: "Ana",
        rol: "familiar",
        relacion_con_abuelo: "hija",
        abuelo_id: abueloId,
        created_at: now,
      },
    ],
    abuelos: [
      {
        id: abueloId,
        nombre: "Carlos",
        fecha_nacimiento: "1948-03-12",
        notas_generales: "Le gusta el mate, el fútbol y contar historias de su pueblo natal.",
        created_at: now,
      },
    ],
    recordatorios: [
      {
        id: randomUUID(),
        abuelo_id: abueloId,
        tipo: "medicamento",
        descripcion: "Tomar la pastilla de la presión",
        hora: "09:00",
        frecuencia: "diario",
        creado_por: familiarId,
        activo: true,
        created_at: now,
        ultima_notificacion: null,
      },
    ],
    memorias: [
      {
        id: randomUUID(),
        abuelo_id: abueloId,
        resumen:
          "Carlos contó cómo conoció a su esposa Marta en un baile del club del pueblo en 1968, y que le costó tres meses invitarla a bailar por lo tímido que era.",
        transcripcion_original:
          "Yo a Marta la conocí en un baile del club... yo era muy tímido, ¿sabes? Tardé como tres meses en animarme a sacarla a bailar. Al final fue ella la que me sacó a mí.",
        tema: "familia",
        personas_mencionadas: ["Marta"],
        emocion_detectada: "nostalgia",
        fecha: now,
        embedding_id_pinecone: null,
      },
    ],
    conversaciones: [],
    alertas_emergencia: [],
  };
}

function ensureDb(): DbShape {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = seed();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    // Compatibilidad con db.json generados antes de sumar alertas_emergencia.
    if (!parsed.alertas_emergencia) parsed.alertas_emergencia = [];
    return parsed as DbShape;
  } catch {
    const initial = seed();
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

  // --- Abuelos ---
  listAbuelos(): Abuelo[] {
    return ensureDb().abuelos;
  },
  getAbuelo(id: string): Abuelo | undefined {
    return ensureDb().abuelos.find((a) => a.id === id);
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
};
