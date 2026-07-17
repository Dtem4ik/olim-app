/**
 * Pure in-memory search matcher (Phase 6a) — the fallback the search API uses
 * when no Supabase stack is configured (CI e2e, a preview before the remote is
 * seeded, local dev without Docker). It approximates the DB path (Postgres FTS +
 * pg_trgm) closely enough that the SAME search flows — exact word, partial,
 * *typo* — pass against it too, so e2e stays meaningful without a database.
 *
 * The real ranked search runs in Postgres (`public.search_steps`); this mirror
 * exists only so screens never go dark without a DB. Keep them behaviourally
 * aligned: substring match (exact/partial) + trigram similarity (typo tolerance,
 * pg_trgm-style ≥0.3 threshold with word padding).
 */

import type { SearchResults, SearchSectionResult, SearchStepResult } from "./types";

/**
 * Typo threshold for the per-word similarity below. This mirrors the INTENT of
 * Postgres `word_similarity` (the DB path uses the `<%` operator): a mistyped
 * query word should still match the word it meant, even inside a long title.
 * Full-string trigram similarity would dilute to near-zero on long titles, so we
 * score per query-word instead. 0.45 clears real typos ("купат халим"→"холим")
 * while rejecting unrelated words.
 */
const WORD_SIM_THRESHOLD = 0.45;

export const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

const wordsOf = (s: string) =>
  normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/** Padded 3-grams of a single word, mirroring pg_trgm ("  w " padding). */
export function trigrams(word: string): Set<string> {
  const out = new Set<string>();
  const padded = `  ${word} `;
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
}

/** Jaccard similarity over two words' trigram sets — pg_trgm `similarity()` (0..1). */
export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const g of ta) if (tb.has(g)) shared++;
  return shared / (ta.size + tb.size - shared);
}

/**
 * Average, over each query word, of its best trigram similarity to any word in
 * `text` — the JS analogue of Postgres `word_similarity(query, text)`. Robust to
 * long multi-word titles (each query word is judged against the single title word
 * it best matches, not the whole string).
 */
export function wordSimilarity(query: string, text: string): number {
  const qw = wordsOf(query);
  const tw = wordsOf(text);
  if (qw.length === 0 || tw.length === 0) return 0;
  let sum = 0;
  for (const q of qw) {
    let best = 0;
    for (const t of tw) best = Math.max(best, trigramSimilarity(q, t));
    sum += best;
  }
  return sum / qw.length;
}

/** True (score>0) when `text` contains `q` as a substring or is a close typo match. */
function fieldMatches(text: string | null | undefined, q: string): number {
  if (!text) return 0;
  if (normalize(text).includes(q)) return 1; // exact/partial substring — strongest
  const sim = wordSimilarity(q, text); // typo tolerance
  return sim >= WORD_SIM_THRESHOLD ? sim : 0;
}

type StepLike = {
  slug: string;
  section_slug: string;
  title: string;
  summary: string | null;
};
type SectionLike = { slug: string; title: string; icon: string | null };

/**
 * Match + rank sections and steps for a raw query. Steps carry their section's
 * title/icon (resolved from `sections`) for the result tile. Empty query → empty.
 */
export function matchContent(
  rawQuery: string,
  sections: SectionLike[],
  steps: StepLike[],
  limit = 20,
): Omit<SearchResults, "source"> {
  const q = normalize(rawQuery);
  if (q.length === 0) return { steps: [], sections: [] };

  const sectionBySlug = new Map(sections.map((s) => [s.slug, s]));

  const matchedSections: SearchSectionResult[] = sections
    .map((s) => ({ s, score: fieldMatches(s.title, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => ({ slug: x.s.slug, title: x.s.title, icon: x.s.icon }));

  const matchedSteps: SearchStepResult[] = steps
    .map((s) => ({
      s,
      // Title weighted above summary, matching the tsvector A/B weighting.
      score: Math.max(fieldMatches(s.title, q) * 1.0, fieldMatches(s.summary, q) * 0.6),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => {
      const sec = sectionBySlug.get(x.s.section_slug);
      return {
        slug: x.s.slug,
        section_slug: x.s.section_slug,
        title: x.s.title,
        summary: x.s.summary,
        section_title: sec?.title ?? "",
        section_icon: sec?.icon ?? null,
      };
    });

  return { steps: matchedSteps, sections: matchedSections };
}
