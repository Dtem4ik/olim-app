/**
 * AI-search configuration (Phase 8). Gemini-only stack, single key.
 *
 * Everything is gated on `GEMINI_API_KEY`: absent → embeddings are skipped at
 * import time, the ask box degrades to "AI-ответы скоро", and keyword search
 * still works. The key is server-only (never `NEXT_PUBLIC_*`) — the LLM client
 * lives entirely in route handlers / scripts, never in the browser bundle.
 *
 * This module is dependency-free (no SDK import) so it is safe to read from
 * server components deciding whether to render the ask box.
 */

/** Embedding model + output dimensionality. Mirrors the pgvector column `vector(768)`. */
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMS = 768;

/**
 * Answer models, tried in order when the primary is unavailable (quota / 404 /
 * transient error). Gemini only. `OLIM_ANSWER_MODEL` overrides the primary.
 */
export const ANSWER_MODELS: readonly string[] = [
  process.env.OLIM_ANSWER_MODEL?.trim() || "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash-lite",
];

/** How many fused step chunks are handed to the model as grounding context. */
export const RETRIEVAL_TOP_K = 6;

/**
 * Rate limits for the ask endpoint (Phase 8b). The free Gemini tier throttles the
 * primary answer model (`gemini-3.1-flash-lite`) at **15 RPM / 500 RPD**; the
 * embedding model is 100 RPM (not binding). Each ask = 1 answer call, so the
 * GLOBAL per-minute ceiling (default 10, headroom under 15) protects the shared
 * RPM quota; the daily budget is ~500 answered questions (the fallback models add
 * little — `gemini-2.5-flash-lite` is only ~20 RPD). When a cap trips, callers get
 * a friendly "try later" and keyword search still works. Tunable via env (raise
 * for a paid key).
 */
export const ASK_RATE = {
  perIp: Number(process.env.OLIM_ASK_RATE_PER_IP ?? 5),
  global: Number(process.env.OLIM_ASK_RATE_GLOBAL ?? 10),
  windowMs: 60_000,
} as const;

export function geminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key ? key : undefined;
}

/** Whether the AI-search stack (embeddings + answers) is configured. */
export function isAiConfigured(): boolean {
  return geminiApiKey() !== undefined;
}
