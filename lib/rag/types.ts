/** Shared shapes for hybrid retrieval + grounded answers (Phase 8). */

/** A step retrieved for grounding — rich enough to build the LLM context AND the source card. */
export interface RetrievedStep {
  slug: string;
  section_slug: string;
  title: string;
  summary: string | null;
  section_title: string;
  section_icon: string | null;
  source_url: string;
  last_verified_at: string;
  /** Full step body — grounding context for the model (not sent to the client). */
  body_md: string;
  /** Fused relevance score (higher = better). */
  score: number;
}

/** The trimmed source-card payload sent to the client (no body). */
export interface Source {
  slug: string;
  section_slug: string;
  title: string;
  section_title: string;
  section_icon: string | null;
  source_url: string;
  last_verified_at: string;
}

/** A fully-resolved grounded answer (non-streaming) — used by the eval runner. */
export interface GroundedAnswer {
  /** The answer text (may be the refusal message). */
  answer: string;
  /** True when the model declined to answer from the context ("не знаю" path). */
  refused: boolean;
  /** Step slugs the answer cited (parsed from the model's SOURCES line). */
  citedSlugs: string[];
  /** The steps handed to the model as context, in fused-rank order. */
  sources: Source[];
  /** Which answer model actually produced the answer (after any fallback). */
  model: string;
}

export function toSource(step: RetrievedStep): Source {
  return {
    slug: step.slug,
    section_slug: step.section_slug,
    title: step.title,
    section_title: step.section_title,
    section_icon: step.section_icon,
    source_url: step.source_url,
    last_verified_at: step.last_verified_at,
  };
}
