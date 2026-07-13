/**
 * Server-side content repository (Phase 4). Reads sections + steps from Supabase
 * (anon key, RLS public read) and falls back to the committed fixtures when no
 * stack is configured or it is empty — so screens render in CI (no DB), locally
 * (full content), and in a preview before the shared remote is seeded.
 *
 * Server-only: pulls `node:fs` via the fixtures loader. Never import from a
 * client component.
 */

import { loadContentDir } from "@/lib/content/bundle";
import type { Cond, Stage, WarnRule } from "@/lib/content/schema";
import type { Doc, Tip } from "@/lib/content/tables";
import { getSupabaseAnon } from "@/lib/supabase/client";

export interface ContentSection {
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

/** A step in a shape both Supabase rows and fixtures map onto (and buildPlan accepts). */
export interface ContentStep {
  id: string | null; // null in the fixtures fallback (no DB row)
  slug: string;
  section_slug: string;
  title: string;
  summary: string | null;
  body_md: string;
  docs: Doc[];
  tips: Tip[];
  cond: Cond;
  warn_rule: WarnRule | null;
  stage: Stage | null;
  source_url: string;
  last_verified_at: string;
  sort_order: number;
}

export interface Content {
  sections: ContentSection[];
  steps: ContentStep[];
  /** Where the data came from — surfaced for debugging / the report. */
  source: "supabase" | "fixtures";
}

function fromFixtures(): Content {
  const { bundle } = loadContentDir("content/fixtures");
  const sections: ContentSection[] = bundle.sections.map((s) => ({
    slug: s.slug,
    title: s.title,
    description: s.description ?? null,
    icon: s.icon ?? null,
    sort_order: s.sort_order,
  }));
  const steps: ContentStep[] = bundle.steps.map((s) => ({
    id: null,
    slug: s.slug,
    section_slug: s.section_slug,
    title: s.title,
    summary: s.summary ?? null,
    body_md: s.body_md,
    docs: s.docs,
    tips: s.tips,
    cond: s.cond,
    warn_rule: s.warn_rule ?? null,
    stage: s.stage ?? null,
    source_url: s.source_url,
    last_verified_at: s.last_verified_at,
    sort_order: s.sort_order,
  }));
  return { sections, steps, source: "fixtures" };
}

/**
 * Load all sections + steps. Tries Supabase first; on any error or empty result
 * falls back to fixtures. Cached per-request by React's `cache` is unnecessary
 * here — Next dedups fetches and the dataset is tiny.
 */
export async function getContent(): Promise<Content> {
  const db = getSupabaseAnon();
  if (db) {
    const [sectionsRes, stepsRes] = await Promise.all([
      db.from("sections").select("*").order("sort_order"),
      db.from("steps").select("*"),
    ]);
    if (!sectionsRes.error && !stepsRes.error && stepsRes.data.length > 0) {
      const sections: ContentSection[] = sectionsRes.data.map((s) => ({
        slug: s.slug,
        title: s.title,
        description: s.description,
        icon: s.icon,
        sort_order: s.sort_order,
      }));
      const steps: ContentStep[] = stepsRes.data.map((s) => ({
        id: s.id,
        slug: s.slug,
        section_slug: s.section_slug,
        title: s.title,
        summary: s.summary,
        body_md: s.body_md,
        docs: (s.docs ?? []) as Doc[],
        tips: (s.tips ?? []) as Tip[],
        cond: (s.cond ?? {}) as Cond,
        warn_rule: (s.warn_rule ?? null) as WarnRule | null,
        stage: s.stage as Stage | null,
        source_url: s.source_url,
        last_verified_at: s.last_verified_at,
        sort_order: s.sort_order,
      }));
      return { sections, steps, source: "supabase" };
    }
  }
  return fromFixtures();
}
