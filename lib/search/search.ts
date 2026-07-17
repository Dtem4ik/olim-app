/**
 * Server-side search (Phase 6a). Prefers the Postgres FTS + pg_trgm path
 * (`public.search_steps` RPC + section trigram match); falls back to the pure
 * in-memory matcher over the committed content when no stack is configured (CI,
 * a preview before the remote is seeded, local dev without Docker). Server-only:
 * pulls the fixtures loader (node:fs) via the content repo.
 */

import { getContent } from "@/lib/content/repo";
import { getSupabaseAnon } from "@/lib/supabase/client";
import { matchContent } from "./match";
import type { SearchResults, SearchStepResult } from "./types";

const EMPTY: SearchResults = { steps: [], sections: [], source: "fixtures" };

export async function searchContent(rawQuery: string, limit = 20): Promise<SearchResults> {
  const query = rawQuery.trim();
  if (query.length === 0) return EMPTY;

  const db = getSupabaseAnon();
  if (db) {
    const [stepsRes, sectionsRes] = await Promise.all([
      db.rpc("search_steps", { p_query: query, p_limit: limit }),
      db.from("sections").select("slug, title, icon"),
    ]);
    // Only trust the DB path when the FTS function actually answered — otherwise
    // (migration not yet applied on this stack, RPC error) drop to fixtures.
    if (!stepsRes.error && stepsRes.data) {
      const steps: SearchStepResult[] = stepsRes.data.map((r) => ({
        slug: r.slug,
        section_slug: r.section_slug,
        title: r.title,
        summary: r.summary,
        section_title: r.section_title,
        section_icon: r.section_icon,
      }));
      // Sections are few; match their titles with the same trigram-aware matcher
      // for parity with the step path (matchContent with no steps → sections only).
      const sections = matchContent(query, sectionsRes.data ?? [], []).sections;
      return { steps, sections, source: "supabase" };
    }
  }

  const { sections, steps } = await getContent();
  const matched = matchContent(query, sections, steps, limit);
  return { ...matched, source: "fixtures" };
}
