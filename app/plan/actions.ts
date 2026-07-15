"use server";

import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/server/client-ip";
import { generateShareSlug } from "@/lib/share/share-slug";
import { type SharedAnswers, sharedAnswersSchema, sharedDoneSchema } from "@/lib/share/shared-plan";
import { getSupabaseAnon } from "@/lib/supabase/client";

export type SharePlanResult = { ok: true; slug: string } | { ok: false };

/** Pick only the shareable keys off an untrusted client object before validating. */
function pickShareable(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const r = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {
    stage: r.stage,
    basis: r.basis,
    family: r.family,
    pet: r.pet,
  };
  if (r.country !== undefined) out.country = r.country;
  if (r.childrenAges !== undefined) out.childrenAges = r.childrenAges;
  if (r.monthsInCountry !== undefined) out.monthsInCountry = r.monthsInCountry;
  return out;
}

/**
 * Persist an anonymous shared plan and return its share slug. Runs as a Server
 * Action so the Supabase SDK stays off the client. The answers snapshot is
 * sanitized + validated server-side (privacy: no city/dates/free text) and both
 * inputs are length-capped; writes are rate limited per IP. RLS on `plans`
 * allows anonymous inserts with a null `user_id`.
 */
export async function sharePlan(rawAnswers: unknown, rawDone: unknown): Promise<SharePlanResult> {
  const answers = sharedAnswersSchema.safeParse(pickShareable(rawAnswers));
  if (!answers.success) return { ok: false };

  const done = sharedDoneSchema.safeParse(rawDone);
  if (!done.success) return { ok: false };

  const ip = await getClientIp();
  const limited = rateLimit(`share:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limited.ok) return { ok: false };

  const db = getSupabaseAnon();
  if (!db) return { ok: false };

  const snapshot: SharedAnswers = answers.data;
  const slug = generateShareSlug();
  const { error } = await db.from("plans").insert({
    share_slug: slug,
    answers: snapshot,
    done_step_ids: done.data,
    user_id: null,
  });
  if (error) return { ok: false };
  return { ok: true, slug };
}
