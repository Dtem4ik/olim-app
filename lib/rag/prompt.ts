/**
 * The grounded-answer prompt contract (Phase 8b) — the guardrail that makes a
 * hallucinated deadline/sum impossible. Kept pure and dependency-free so the
 * parsing half is unit-tested and shared by both the streaming route and the
 * eval runner.
 *
 * Contract:
 *  - the model answers ONLY from the provided step context;
 *  - it never invents numbers, dates, sums, or Hebrew terms;
 *  - it cites the steps it used on a final `SOURCES: slug, slug` line;
 *  - when the context does not contain the answer it outputs the bare token
 *    `NO_ANSWER` (the app then renders the honest "не нашёл — вот близкие
 *    разделы" path).
 */

import type { RetrievedStep } from "@/lib/rag/types";

/** Bare token the model returns when it cannot answer from the context. */
export const NO_ANSWER_TOKEN = "NO_ANSWER";

/** Per-step body cap in the context — keeps token cost bounded. */
const BODY_CAP = 2000;

export const SYSTEM_PROMPT = `You are the assistant of Olim, an adaptation navigator for new immigrants (olim) to Israel.

HARD RULES:
1. Answer ONLY from the provided CONTEXT (the app's own steps below). This is bureaucratic, legally-sensitive information — an invented deadline or sum can harm a real person.
2. NEVER invent numbers, sums, deadlines, dates, links, or Hebrew terms. Copy any figure, amount, or deadline VERBATIM from the context. If it is not in the context, do not answer it.
3. If the context does not contain the answer, output EXACTLY one line: ${NO_ANSWER_TOKEN} (and nothing else). Do not answer from general knowledge.
4. Answer in the language of the question (default: Russian). Be concise, concrete, and friendly — no filler.
5. At the END of your answer, add a separate line in the form:
SOURCES: slug1, slug2
— list the slugs of the steps from the context you actually relied on, and only those. Never invent a slug that is not in the context.

You never promise outcomes and always defer to the official sources cited in the steps.`;

/** Build the numbered context block + the user turn. */
export function buildUserPrompt(query: string, steps: RetrievedStep[]): string {
  const context = steps
    .map((s, i) => {
      const body = s.body_md.length > BODY_CAP ? `${s.body_md.slice(0, BODY_CAP)}…` : s.body_md;
      return [
        `[Step ${i + 1}] slug: ${s.slug}`,
        `Section: ${s.section_title}`,
        `Title: ${s.title}`,
        s.summary ? `Summary: ${s.summary}` : null,
        body,
        `Official source: ${s.source_url} (verified ${s.last_verified_at})`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  return `CONTEXT (app steps):\n\n${context}\n\n---\n\nQUESTION: ${query}`;
}

export interface ParsedAnswer {
  /** Answer text with the SOURCES line stripped (empty when refused). */
  answer: string;
  refused: boolean;
  /** Cited slugs, filtered to those that actually exist in `knownSlugs`. */
  citedSlugs: string[];
}

/**
 * Parse the model's raw output into answer text + cited slugs + refusal flag.
 * `knownSlugs` is the set of retrieved slugs; any cited slug outside it is a
 * fabricated source and is dropped (the eval runner also flags this).
 */
export function parseAnswer(raw: string, knownSlugs: Iterable<string>): ParsedAnswer {
  const known = new Set(knownSlugs);
  const text = raw.trim();

  // Refusal: the bare token (allow it to appear alone, case-insensitively).
  const withoutSources = text.replace(/^\s*SOURCES:.*$/im, "").trim();
  if (withoutSources.length === 0 || /^NO_ANSWER\b/i.test(withoutSources)) {
    return { answer: "", refused: true, citedSlugs: [] };
  }

  const sourcesMatch = text.match(/^\s*SOURCES:\s*(.*)$/im);
  const citedSlugs = sourcesMatch?.[1]
    ? [
        ...new Set(
          sourcesMatch[1]
            .split(/[,\s]+/)
            .map((s) => s.trim().replace(/[.;]+$/, ""))
            .filter((s) => s.length > 0 && known.has(s)),
        ),
      ]
    : [];

  const answer = text.replace(/^\s*SOURCES:.*$/im, "").trim();
  return { answer, refused: false, citedSlugs };
}
