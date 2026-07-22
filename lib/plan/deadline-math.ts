/**
 * Pure deadline date-math (Phase 7b). No imports — plain TS — so it is the SINGLE
 * source of truth shared by the Next app (via `computeWarning`) and the Deno
 * reminder Edge Function (imported by relative path). Keep it dependency-free.
 *
 * All arithmetic is on calendar days in the ambient timezone (the app uses the
 * device's; the Edge Function uses the server's UTC day). A daily reminder cron
 * only cares about whole-day counts, so that is consistent within each caller.
 */

export type WarnRuleType =
  | "expires_days"
  | "deadline_before_flight_days"
  | "deadline_after_arrival_days";

export interface WarnRuleLike {
  type: WarnRuleType;
  days: number;
}

export interface AnchorDates {
  flightDate?: string | null;
  arrivalDate?: string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse `YYYY-MM-DD` to a local-midnight Date. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/** Format a Date as `YYYY-MM-DD` (local calendar day). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Resolve a warn_rule against the person's anchor dates into an ISO due date,
 * or null when the required anchor (flight/arrival) is unknown.
 * - `deadline_before_flight_days` → flight − days
 * - `deadline_after_arrival_days` / `expires_days` → arrival + days
 */
export function computeDueISO(rule: WarnRuleLike, dates: AnchorDates): string | null {
  if (rule.type === "deadline_before_flight_days") {
    if (!dates.flightDate) return null;
    return toISODate(addDays(parseISODate(dates.flightDate), -rule.days));
  }
  if (!dates.arrivalDate) return null;
  return toISODate(addDays(parseISODate(dates.arrivalDate), rule.days));
}

/** Whole days from `now` to the ISO due date. Negative when overdue, 0 today. */
export function daysUntil(dueISO: string, now: Date): number {
  return Math.round((startOfDayMs(parseISODate(dueISO)) - startOfDayMs(now)) / MS_PER_DAY);
}
