import fs from "fs";
import path from "path";
import { getEmbedding, cosineSimilarity } from "./embeddings";

/**
 * Memoria vectorial para RAG sobre las historias del abuelo.
 * Modo real: Pinecone (índice "grillo-memorias", namespace = abueloId).
 * Modo mock: archivo local /data/vectorstore.json con embeddings mock + similitud coseno.
 * Misma interfaz en ambos casos, así el switch es transparente para quien la llama.
 */

interface VectorRecord {
  id: string;
  abueloId: string;
  texto: string;
  vector: number[];
}

const VSTORE_FILE = path.join(process.cwd(), "data", "vectorstore.json");

export function isPineconeConfigured(): boolean {
  return Boolean(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX);
}

function readLocalStore(): VectorRecord[] {
  if (!fs.existsSync(VSTORE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(VSTORE_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeLocalStore(records: VectorRecord[]) {
  const dir = path.dirname(VSTORE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(VSTORE_FILE, JSON.stringify(records, null, 2), "utf-8");
}

async function getPineconeIndex() {
  const { Pinecone } = await import("@pinecone-database/pinecone");
  const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
  return client.index(process.env.PINECONE_INDEX as string);
}

export async function indexarMemoria(
  memoriaId: string,
  abueloId: string,
  texto: string
): Promise<string> {
  const vector = await getEmbedding(texto);

  if (isPineconeConfigured()) {
    try {
      const index = await getPineconeIndex();
      await index.namespace(abueloId).upsert([
        { id: memoriaId, values: vector, metadata: { texto } },
      ]);
      return memoriaId;
    } catch (err) {
      console.error("[pinecone] fallo al indexar en real, usando mock:", err);
    }
  }

  const records = readLocalStore();
  const filtered = records.filter((r) => r.id !== memoriaId);
  filtered.push({ id: memoriaId, abueloId, texto, vector });
  writeLocalStore(filtered);
  return memoriaId;
}

export interface ResultadoBusquedaMemoria {
  id: string;
  texto: string;
  score: number;
}

export async function buscarMemoriasSimilares(
  abueloId: string,
  consulta: string,
  topK = 4
): Promise<ResultadoBusquedaMemoria[]> {
  const queryVector = await getEmbedding(consulta);

  if (isPineconeConfigured()) {
    try {
      const index = await getPineconeIndex();
      const res = await index.namespace(abueloId).query({
        vector: queryVector,
        topK,
        includeMetadata: true,
      });
      return (res.matches ?? []).map((m) => ({
        id: m.id,
        texto: (m.metadata?.texto as string) ?? "",
        score: m.score ?? 0,
      }));
    } catch (err) {
      console.error("[pinecone] fallo al buscar en real, usando mock:", err);
    }
  }

  await backfillVectorStore(abueloId);

  const records = readLocalStore().filter((r) => r.abueloId === abueloId);
  const scored = records
    .map((r) => ({ id: r.id, texto: r.texto, score: cosineSimilarity(queryVector, r.vector) }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Indexa (en el store mock) cualquier memoria que ya exista en la base de datos
 * pero todavía no tenga vector guardado — cubre el dato semilla y cualquier
 * memoria insertada directamente en la DB sin pasar por el tool guardar_memoria.
 */
async function backfillVectorStore(abueloId: string): Promise<void> {
  const { listMemorias } = await import("@/lib/db");
  const memorias = await listMemorias(abueloId);
  const existentes = new Set(readLocalStore().map((r) => r.id));
  const faltantes = memorias.filter((m) => !existentes.has(m.id));
  if (faltantes.length === 0) return;

  const nuevos: VectorRecord[] = [];
  for (const m of faltantes) {
    const vector = await getEmbedding(m.resumen);
    nuevos.push({ id: m.id, abueloId, texto: m.resumen, vector });
  }
  writeLocalStore([...readLocalStore(), ...nuevos]);
}
