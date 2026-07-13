"use server";

import { getSupabaseAnon } from "@/lib/supabase/client";

/**
 * Record a "this step looks outdated" report. Runs as a Server Action so the
 * Supabase client (and its SDK) never ships to the browser. RLS on
 * `step_reports` is insert-only; a null client (unconfigured/CI) is a no-op.
 */
export async function reportOutdated(
  stepId: string,
  comment: string | null,
): Promise<{ ok: boolean }> {
  const db = getSupabaseAnon();
  if (!db) return { ok: false };
  const { error } = await db
    .from("step_reports")
    .insert({ step_id: stepId, reason: "outdated", comment });
  return { ok: !error };
}
