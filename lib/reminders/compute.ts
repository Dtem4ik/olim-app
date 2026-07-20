/**
 * Which deadline reminders are due for one user right now (Phase 7b). Pure and
 * unit-tested — the authoritative reference for the reminder Edge Function, which
 * mirrors this loop in Deno over the same shared `deadline-math`.
 */

import {
  type AnchorDates,
  computeDueISO,
  daysUntil,
  type WarnRuleLike,
} from "@/lib/plan/deadline-math";

/** A step that can raise a deadline (has a warn_rule). */
export interface ReminderStep {
  slug: string;
  title: string;
  sectionSlug: string;
  warnRule: WarnRuleLike;
}

/** The opted-in user's plan inputs. */
export interface ReminderUserPlan {
  answers: AnchorDates;
  doneStepIds: string[];
  /** Lead time in days (30 / 14 / 7); the reminder fires inside this window. */
  leadDays: number;
}

export interface DueReminder {
  stepSlug: string;
  title: string;
  sectionSlug: string;
  dueISO: string;
  daysUntil: number;
}

/**
 * Reminders to send: for each not-done step with a computable due date whose
 * deadline falls inside `[0, leadDays]` (upcoming, not overdue) and that hasn't
 * already been sent (dedup key `(user, step, leadDays)` — `alreadySent` holds the
 * step slugs already logged at this threshold).
 */
export function computeDueReminders(
  plan: ReminderUserPlan,
  steps: readonly ReminderStep[],
  now: Date,
  alreadySent: ReadonlySet<string>,
): DueReminder[] {
  const done = new Set(plan.doneStepIds);
  const out: DueReminder[] = [];
  for (const step of steps) {
    if (done.has(step.slug) || alreadySent.has(step.slug)) continue;
    const dueISO = computeDueISO(step.warnRule, plan.answers);
    if (!dueISO) continue;
    const d = daysUntil(dueISO, now);
    if (d < 0 || d > plan.leadDays) continue;
    out.push({
      stepSlug: step.slug,
      title: step.title,
      sectionSlug: step.sectionSlug,
      dueISO,
      daysUntil: d,
    });
  }
  return out;
}
