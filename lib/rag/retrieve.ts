/**
 * Hybrid retrieval (Phase 8a), server-only.
 *
 * Combines the Phase 6 full-text arm (`search_steps` RPC) with vector similarity
 * (`match_steps` RPC over Gemini embeddings) using Reciprocal Rank Fusion, then
 * hydrates the fused top-k from the content repo so each result carries its full
 * body + source metadata (for grounding and the source cards).
 *
 * Graceful degradation:
 *  - no `GEMINI_API_KEY` → vector arm is skipped, FTS-only (still useful).
 *  - no Supabase stack   → pure in-memory matcher over the committed content
 *                          (`lib/search/match.ts`), so retrieval never throws.
 */

import { getContent } from "@/lib/content/repo";
import { isAiConfigured } from "@/lib/rag/config";
import { embedQuery, toVectorLiteral } from "@/lib/rag/embeddings";
import { fuseRankings } from "@/lib/rag/fuse";
import type { RetrievedStep } from "@/lib/rag/types";
import { matchContent } from "@/lib/search/match";
import { getSupabaseAnon } from "@/lib/supabase/client";

const ARM_LIMIT = 20;

export async function retrieveSteps(query: string, topK = 6): Promise<RetrievedStep[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const content = await getContent();
  const stepBySlug = new Map(content.steps.map((s) => [s.slug, s]));
  const sectionBySlug = new Map(content.sections.map((s) => [s.slug, s]));

  let ftsSlugs: string[] = [];
  let vecSlugs: string[] = [];

  const db = getSupabaseAnon();
  if (db) {
    const ftsRes = await db.rpc("search_steps", { p_query: trimmed, p_limit: ARM_LIMIT });
    if (!ftsRes.error && ftsRes.data) ftsSlugs = ftsRes.data.map((r) => r.slug);

    if (isAiConfigured()) {
      try {
        const embedding = await embedQuery(trimmed);
        const vecRes = await db.rpc("match_steps", {
          p_query_embedding: toVectorLiteral(embedding),
          p_limit: ARM_LIMIT,
        });
        if (!vecRes.error && vecRes.data) vecSlugs = vecRes.data.map((r) => r.slug);
      } catch {
        // Embedding hiccup / quota → fall through on FTS alone.
      }
    }
  }

  // No DB arms produced anything (no stack, or migration not applied) → in-memory.
  if (ftsSlugs.length === 0 && vecSlugs.length === 0) {
    ftsSlugs = matchContent(trimmed, content.sections, content.steps, ARM_LIMIT).steps.map(
      (s) => s.slug,
    );
  }

  const fused = fuseRankings([vecSlugs, ftsSlugs]).slice(0, topK);

  return fused.flatMap(({ slug, score }): RetrievedStep[] => {
    const step = stepBySlug.get(slug);
    if (!step) return [];
    const section = sectionBySlug.get(step.section_slug);
    return [
      {
        slug: step.slug,
        section_slug: step.section_slug,
        title: step.title,
        summary: step.summary,
        section_title: section?.title ?? step.section_slug,
        section_icon: section?.icon ?? null,
        source_url: step.source_url,
        last_verified_at: step.last_verified_at,
        body_md: step.body_md,
        score,
      },
    ];
  });
}
