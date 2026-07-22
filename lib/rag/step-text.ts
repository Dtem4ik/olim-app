/**
 * The canonical text an embedding is computed from for a step (Phase 8a).
 * Shared by the import pipeline so the document vector always covers the same
 * fields (title + summary + body). Kept dependency-free and tiny.
 */

export function buildStepEmbeddingText(step: {
  title: string;
  summary?: string | null;
  body_md: string;
}): string {
  const parts = [step.title];
  if (step.summary) parts.push(step.summary);
  parts.push(step.body_md);
  // Mirror the DB body cap (8000) so we never send an oversized embedding input.
  return parts.join("\n\n").slice(0, 8000);
}
