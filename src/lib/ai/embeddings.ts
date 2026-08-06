/**
 * Genera embeddings para indexar memorias en Pinecone.
 * Modo real: OpenAI text-embedding-3-small (si hay OPENAI_API_KEY).
 * Modo mock: un "pseudo-embedding" determinístico basado en hashing de palabras,
 * suficiente para que la búsqueda mock por similitud tenga sentido en la demo.
 */

// Debe coincidir con la dimensión del índice real de Pinecone (grillo-memorias
// fue creado con dimension=1024) para que el upsert/query funcione tal cual,
// incluso sin OPENAI_API_KEY. Si en el futuro se conecta OpenAI, hay que
// recrear el índice en 1536 (text-embedding-3-small) o usar un modelo de
// 1024 dims.
const MOCK_DIM = 1024;

export function isEmbeddingsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function mockEmbedding(text: string): number[] {
  const vec = new Array(MOCK_DIM).fill(0);
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) % MOCK_DIM;
    }
    vec[hash] += 1;
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (isEmbeddingsConfigured()) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      return res.data[0].embedding;
    } catch (err) {
      console.error("[embeddings] fallo API real, usando mock:", err);
    }
  }
  return mockEmbedding(text);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
