import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/db/supabaseClient";

/**
 * Almacenamiento de los archivos de las fotos del libro. Mismo patrón que el
 * resto de la app: con Supabase configurado usa un bucket privado de Supabase
 * Storage; sin él cae a disco local (/data/fotos), solo para desarrollo.
 * El resto del código nunca toca el bucket ni el disco directo.
 */

const BUCKET = "fotos-legado";
const DIR_LOCAL = path.join(process.cwd(), "data", "fotos");
const SEGUNDOS_URL_FIRMADA = 60 * 60;

export type FormatoFoto = "jpg" | "png";

const CONTENT_TYPE: Record<FormatoFoto, string> = {
  jpg: "image/jpeg",
  png: "image/png",
};

let bucketListo = false;

// El SQL de schema.sql ya crea el bucket; esto cubre el caso de que ese
// insert no se haya podido correr (permisos) para que subir una foto igual
// funcione la primera vez.
async function asegurarBucket(): Promise<void> {
  if (bucketListo) return;
  const { error } = await getSupabaseClient().storage.createBucket(BUCKET, { public: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  bucketListo = true;
}

function rutaLocal(storagePath: string): string {
  const completa = path.resolve(DIR_LOCAL, storagePath);
  if (!completa.startsWith(path.resolve(DIR_LOCAL) + path.sep)) {
    throw new Error("Ruta de foto inválida");
  }
  return completa;
}

/** Detecta el formato real por los primeros bytes — no confía en el nombre ni en el Content-Type. */
export function detectarFormatoFoto(buffer: Buffer): FormatoFoto | null {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }
  return null;
}

export function formatoDesdeRuta(storagePath: string): FormatoFoto {
  return storagePath.toLowerCase().endsWith(".png") ? "png" : "jpg";
}

export async function guardarArchivoFoto(
  abueloId: string,
  buffer: Buffer,
  formato: FormatoFoto
): Promise<string> {
  const storagePath = `${abueloId}/${randomUUID()}.${formato}`;
  if (isSupabaseConfigured()) {
    await asegurarBucket();
    const { error } = await getSupabaseClient()
      .storage.from(BUCKET)
      .upload(storagePath, buffer, { contentType: CONTENT_TYPE[formato], upsert: false });
    if (error) throw error;
  } else {
    const destino = rutaLocal(storagePath);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, buffer);
  }
  return storagePath;
}

export async function leerArchivoFoto(storagePath: string): Promise<Buffer | null> {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseClient().storage.from(BUCKET).download(storagePath);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    }
    const origen = rutaLocal(storagePath);
    return fs.existsSync(origen) ? fs.readFileSync(origen) : null;
  } catch (err) {
    console.error("[storage/fotos] no se pudo leer", storagePath, err);
    return null;
  }
}

export async function borrarArchivoFoto(storagePath: string): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      await getSupabaseClient().storage.from(BUCKET).remove([storagePath]);
    } else {
      const origen = rutaLocal(storagePath);
      if (fs.existsSync(origen)) fs.unlinkSync(origen);
    }
  } catch (err) {
    console.error("[storage/fotos] no se pudo borrar", storagePath, err);
  }
}

/**
 * URL que el navegador puede cargar directo en un <img>. En Supabase es una
 * URL firmada de 1 hora (el bucket es privado); en modo local, un data URL
 * leído del disco, porque ahí no hay un servidor de archivos aparte.
 */
export async function urlDeFoto(storagePath: string): Promise<string | null> {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseClient()
        .storage.from(BUCKET)
        .createSignedUrl(storagePath, SEGUNDOS_URL_FIRMADA);
      if (error || !data) return null;
      return data.signedUrl;
    }
    const buffer = await leerArchivoFoto(storagePath);
    if (!buffer) return null;
    return `data:${CONTENT_TYPE[formatoDesdeRuta(storagePath)]};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("[storage/fotos] no se pudo armar la URL", storagePath, err);
    return null;
  }
}
