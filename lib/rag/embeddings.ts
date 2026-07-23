/**
 * Query + document embeddings via Gemini (Phase 8a), server-only.
 *
 * Asymmetric task types: content is embedded as `RETRIEVAL_DOCUMENT` (at import
 * time), the user's query as `RETRIEVAL_QUERY` (at request time) — Google's
 * recommended pairing for retrieval quality. Output is truncated to
 * `EMBEDDING_DIMS` (Matryoshka); cosine similarity is scale-invariant so no
 * renormalization is needed for the pgvector cosine index.
 */

import { embed, embedMany } from "ai";
import { EMBEDDING_DIMS, EMBEDDING_MODEL } from "./config";
import { getGoogle } from "./provider";

/** Serialize an embedding to the pgvector text literal `[a,b,c]`. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function requireGoogle() {
  const google = getGoogle();
  if (!google) throw new Error("GEMINI_API_KEY is not set — cannot embed.");
  return google;
}

/** Embed content chunks (import time). Preserves input order. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const google = requireGoogle();
  const { embeddings } = await embedMany({
    model: google.embedding(EMBEDDING_MODEL),
    values: texts,
    providerOptions: {
      google: { outputDimensionality: EMBEDDING_DIMS, taskType: "RETRIEVAL_DOCUMENT" },
    },
  });
  return embeddings;
}

/** Embed a single user query (request time). */
export async function embedQuery(query: string): Promise<number[]> {
  const google = requireGoogle();
  const { embedding } = await embed({
    model: google.embedding(EMBEDDING_MODEL),
    value: query,
    providerOptions: {
      google: { outputDimensionality: EMBEDDING_DIMS, taskType: "RETRIEVAL_QUERY" },
    },
  });
  return embedding;
}
