/**
 * Grounded answer generation (Phase 8b), server-only.
 *
 * Two entry points share one prompt contract + one model-fallback ladder:
 *  - `generateGroundedAnswer` (non-streaming) — used by the eval runner.
 *  - `streamGroundedAnswer` (async generator of events) — used by /api/ask.
 *
 * The LLM client lives here and in the route only; it never reaches the browser.
 */

import { generateText, streamText } from "ai";
import { ANSWER_MODELS, RETRIEVAL_TOP_K } from "@/lib/rag/config";
import { buildUserPrompt, parseAnswer, SYSTEM_PROMPT } from "@/lib/rag/prompt";
import { getGoogle } from "@/lib/rag/provider";
import { retrieveSteps } from "@/lib/rag/retrieve";
import { createStreamCleaner } from "@/lib/rag/stream-clean";
import { type GroundedAnswer, type RetrievedStep, type Source, toSource } from "@/lib/rag/types";

const MAX_OUTPUT_TOKENS = 700;

/** Non-streaming answer over an explicit context — used by the eval runner and tests. */
export async function answerFromSteps(
  query: string,
  steps: RetrievedStep[],
): Promise<GroundedAnswer> {
  const google = getGoogle();
  if (!google) throw new Error("GEMINI_API_KEY is not set — cannot answer.");
  const sources = steps.map(toSource);

  if (steps.length === 0) {
    return { answer: "", refused: true, citedSlugs: [], sources, model: ANSWER_MODELS[0] ?? "" };
  }

  const system = SYSTEM_PROMPT;
  const prompt = buildUserPrompt(query, steps);
  const knownSlugs = steps.map((s) => s.slug);

  let lastError: unknown;
  for (const modelId of ANSWER_MODELS) {
    try {
      const { text } = await generateText({
        model: google(modelId),
        system,
        prompt,
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      const parsed = parseAnswer(text, knownSlugs);
      return { ...parsed, sources, model: modelId };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All answer models failed.");
}

/** Retrieve + answer in one call (non-streaming). */
export async function generateGroundedAnswer(
  query: string,
  topK = RETRIEVAL_TOP_K,
): Promise<GroundedAnswer> {
  const steps = await retrieveSteps(query, topK);
  return answerFromSteps(query, steps);
}

export type AskEvent =
  | { type: "sources"; sources: Source[] }
  | { type: "text"; text: string }
  | { type: "done"; refused: boolean; citedSlugs: string[]; model: string }
  | { type: "error" };

/**
 * Streaming grounded answer as an async generator of typed events. Emits the
 * retrieved `sources` up front, then cleaned answer `text` deltas, then a final
 * `done` with the refusal flag + parsed citations. Falls back down the model
 * ladder only while nothing has been streamed yet (a mid-stream failure just ends
 * the answer). The SOURCES / NO_ANSWER control lines never reach the client.
 */
export async function* streamGroundedAnswer(
  query: string,
  topK = RETRIEVAL_TOP_K,
): AsyncGenerator<AskEvent> {
  const google = getGoogle();
  if (!google) {
    yield { type: "error" };
    return;
  }

  const steps = await retrieveSteps(query, topK);
  yield { type: "sources", sources: steps.map(toSource) };

  if (steps.length === 0) {
    yield { type: "done", refused: true, citedSlugs: [], model: ANSWER_MODELS[0] ?? "" };
    return;
  }

  const system = SYSTEM_PROMPT;
  const prompt = buildUserPrompt(query, steps);
  const knownSlugs = steps.map((s) => s.slug);

  let lastError: unknown;
  for (const modelId of ANSWER_MODELS) {
    const cleaner = createStreamCleaner();
    let raw = "";
    let emitted = false;
    try {
      const result = streamText({
        model: google(modelId),
        system,
        prompt,
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      for await (const delta of result.textStream) {
        raw += delta;
        const clean = cleaner.push(delta);
        if (clean) {
          emitted = true;
          yield { type: "text", text: clean };
        }
      }
      const tail = cleaner.end();
      const parsed = parseAnswer(raw, knownSlugs);
      if (tail && !parsed.refused) {
        emitted = true;
        yield { type: "text", text: tail };
      }
      yield {
        type: "done",
        refused: parsed.refused,
        citedSlugs: parsed.citedSlugs,
        model: modelId,
      };
      return;
    } catch (error) {
      lastError = error;
      if (emitted) {
        // Already streamed partial output from this model — don't restart.
        yield { type: "done", refused: false, citedSlugs: [], model: modelId };
        return;
      }
      // Nothing emitted yet → try the next model in the ladder.
    }
  }

  // Every model failed before emitting anything.
  void lastError;
  yield { type: "error" };
}
