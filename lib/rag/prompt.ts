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
2. NEVER invent numbers, sums, deadlines, dates, or Hebrew terms. Copy any figure, amount, or deadline VERBATIM from the context. If it is not in the context, do not state it.
3. NEVER write a URL, link, or web address in your answer. The app shows the official source separately.
4. Do NOT add ANY fact, claim, qualifier, or detail that is not written WORD-FOR-WORD in the context — even if you are certain it is true in real life. In particular, do not say whether something is free / cheap / paid, WHEN to do it or by when ("in the first weeks", "right away", "immediately"), how long it takes, how easy or automatic it is, or that anything is guaranteed — UNLESS that exact fact is written in the context. Reproduce what the context says, never a stronger or more specific version of it.
5. Answer only the part of the question the context covers; silently omit anything it does not. If the context contains NOTHING relevant, output EXACTLY one line: ${NO_ANSWER_TOKEN} (and nothing else). Never answer from general knowledge.
6. Answer in the language of the question (default: Russian). Be concise, concrete, and friendly — no filler.
7. SELF-AUDIT before you finish: re-read every sentence and delete any word, number, timing, cost, link, or claim that is not literally present in the context above.
8. At the END of your answer, add a separate line in the form:
SOURCES: slug1, slug2
— list the slugs of the steps from the context you actually relied on, and only those. Never invent a slug that is not in the context.

EXAMPLE OF A FORBIDDEN ADDITION: if the context says olim "often get a reduced fee tariff" (льготный тариф), you must NOT write that opening an account "is free" (бесплатно) — that overstates the source.

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

  return (
    `CONTEXT (app steps):\n\n${context}\n\n---\n\nQUESTION: ${query}\n\n` +
    `REMINDER: Use only facts written in the CONTEXT above. Do not add that anything is free, cheap, fast, easy, automatic, or guaranteed, and do not add any timing, number, sum, date, or link, unless those exact words appear in the CONTEXT.`
  );
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
