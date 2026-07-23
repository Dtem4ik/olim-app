/**
 * Gemini provider instance (Phase 8), server-only. Returns `null` when
 * `GEMINI_API_KEY` is absent so every caller can degrade gracefully. The SDK
 * defaults to `GOOGLE_GENERATIVE_AI_API_KEY`; we standardize on `GEMINI_API_KEY`
 * (the name already present in `.env.local`), so the key is passed explicitly.
 */

import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { geminiApiKey } from "./config";

let cached: GoogleGenerativeAIProvider | null | undefined;

export function getGoogle(): GoogleGenerativeAIProvider | null {
  if (cached !== undefined) return cached;
  const apiKey = geminiApiKey();
  cached = apiKey ? createGoogleGenerativeAI({ apiKey }) : null;
  return cached;
}
