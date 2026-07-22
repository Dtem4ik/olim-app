/**
 * Shared shapes + pure merge logic for the account sync layer (Phase 7a).
 * Kept framework-free (no next/react imports) so it is unit-testable and usable
 * on both the client and the route handlers.
 */

import { z } from "zod";
import { type Profile, profileSchema } from "@/lib/plan/profile";

/** Reminder lead times offered (days before a deadline). */
export const REMINDER_LEAD_DAYS = [7, 14, 30] as const;
export type ReminderLeadDays = (typeof REMINDER_LEAD_DAYS)[number];

/** A user's synced account state as the app consumes it. */
export interface SyncState {
  answers: Profile | null;
  doneStepIds: string[];
  remindersEnabled: boolean;
  reminderLeadDays: ReminderLeadDays;
}

/** The plan portion the merge cares about. */
export interface PlanState {
  answers: Profile | null;
  doneStepIds: string[];
}

/** Parse a DB `answers` jsonb blob into a Profile, or null if empty/invalid. */
export function parseAnswers(raw: unknown): Profile | null {
  const result = profileSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Union two done-slug lists, order-stable and deduped. */
export function unionDone(a: string[], b: string[]): string[] {
  const seen = new Set(a);
  const out = [...a];
  for (const s of b) {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/**
 * First-sign-in / cross-device merge: server answers win when present (the
 * account is the source of truth once it exists), otherwise adopt the local
 * ones; done-steps are UNIONed so a device's local progress is never lost.
 * (Known, low-harm limitation: an unchecked step on device A can be re-added by
 * device B's stale cache — a checklist re-mark, documented in the phase report.)
 */
export function mergePlanState(server: PlanState, local: PlanState): PlanState {
  return {
    answers: server.answers ?? local.answers,
    doneStepIds: unionDone(server.doneStepIds, local.doneStepIds),
  };
}

// --- Wire schemas (validate untrusted client bodies in the route handlers) ---

const doneSchema = z.array(z.string().max(120)).max(1000);

/** Body for the write-through PUT /api/state. */
export const syncPushSchema = z.object({
  answers: profileSchema.nullable(),
  doneStepIds: doneSchema,
});

/** Body for the bootstrap POST /api/state (adds this device's share slugs). */
export const syncBootstrapSchema = syncPushSchema.extend({
  createdSlugs: z.array(z.string().max(64)).max(200).default([]),
});

export type SyncPushBody = z.infer<typeof syncPushSchema>;
export type SyncBootstrapBody = z.infer<typeof syncBootstrapSchema>;
