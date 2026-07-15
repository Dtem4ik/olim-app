import "server-only";

import { cache } from "react";
import { getContent } from "@/lib/content/repo";
import type { Stage } from "@/lib/content/schema";
import { buildPlan } from "@/lib/plan/build-plan";
import { getSupabaseAnon } from "@/lib/supabase/client";
import { isShareSlug } from "./share-slug";
import { sharedAnswersSchema, sharedDoneSchema, toPlanAnswers } from "./shared-plan";

export interface SharedPlanEntry {
  slug: string;
  title: string;
  done: boolean;
}

export interface SharedPlanGroup {
  stage: Stage | null;
  entries: SharedPlanEntry[];
}

export interface LoadedSharedPlan {
  groups: SharedPlanGroup[];
  total: number;
  doneCount: number;
}

/**
 * Load a shared plan by its slug: read the anonymous `plans` row via the
 * SECURITY DEFINER RPC (only ever the one row whose slug the caller knows),
 * validate the privacy-safe snapshot, then rebuild the matched steps with the
 * condition engine and mark done ones. Returns null when the slug is malformed,
 * the row is missing/corrupt, or no database is configured. Server-only.
 */
export const loadSharedPlan = cache(_loadSharedPlan);

async function _loadSharedPlan(slug: string): Promise<LoadedSharedPlan | null> {
  if (!isShareSlug(slug)) return null;

  const db = getSupabaseAnon();
  if (!db) return null;

  const { data, error } = await db.rpc("get_plan_by_share_slug", { p_share_slug: slug });
  if (error || !data) return null;

  const answers = sharedAnswersSchema.safeParse(data.answers);
  const done = sharedDoneSchema.safeParse(data.done_step_ids);
  if (!answers.success || !done.success) return null;

  const doneSet = new Set(done.data);
  const { steps } = await getContent();
  const plan = buildPlan(toPlanAnswers(answers.data), steps);

  const groups: SharedPlanGroup[] = plan.stages.map((g) => ({
    stage: g.stage,
    entries: g.entries.map((e) => ({
      slug: e.step.slug,
      title: e.step.title,
      done: doneSet.has(e.step.slug),
    })),
  }));
  const total = plan.entries.length;
  const doneCount = plan.entries.reduce((n, e) => n + (doneSet.has(e.step.slug) ? 1 : 0), 0);

  return { groups, total, doneCount };
}
