"use server";

import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/server/client-ip";
import { getSupabaseAnon } from "@/lib/supabase/client";

/** Free-text comment: trimmed, capped to the DB CHECK (`comment` ≤ 2000). */
const commentSchema = z
  .string()
  .trim()
  .max(2000)
  .transform((s) => (s.length === 0 ? null : s))
  .nullable();

const uuidSchema = z.string().uuid();

/**
 * Record a "this step looks outdated" report. Runs as a Server Action so the
 * Supabase client (and its SDK) never ships to the browser. RLS on
 * `step_reports` is insert-only; a null client (unconfigured/CI) is a no-op.
 *
 * Hardened (Phase 5): the comment is validated + length-capped server-side
 * (never trusting the client, matching the DB CHECK), and writes are rate limited
 * per IP so the anonymous endpoint cannot be spammed.
 */
export async function reportOutdated(
  stepId: string,
  comment: string | null,
): Promise<{ ok: boolean }> {
  const id = uuidSchema.safeParse(stepId);
  if (!id.success) return { ok: false };

  const parsedComment = commentSchema.safeParse(comment ?? "");
  if (!parsedComment.success) return { ok: false };

  const ip = await getClientIp();
  const limited = rateLimit(`report:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limited.ok) return { ok: false };

  const db = getSupabaseAnon();
  if (!db) return { ok: false };
  const { error } = await db
    .from("step_reports")
    .insert({ step_id: id.data, reason: "outdated", comment: parsedComment.data });
  return { ok: !error };
}
