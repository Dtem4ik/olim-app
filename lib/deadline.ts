/** Deadline urgency, derived purely from dates so it can be unit-tested. */
export type DeadlineKind = "overdue" | "today" | "soon" | "later";

export interface DeadlineStatus {
  kind: DeadlineKind;
  /** Whole days from `now` to `due`. Negative when overdue, 0 today. */
  days: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Classify a deadline relative to `now`.
 * `soonWithinDays` controls when an upcoming date is considered urgent.
 */
export function getDeadlineStatus(
  due: Date,
  now: Date = new Date(),
  soonWithinDays = 7,
): DeadlineStatus {
  const days = Math.round((startOfDay(due) - startOfDay(now)) / MS_PER_DAY);

  if (days < 0) return { kind: "overdue", days };
  if (days === 0) return { kind: "today", days };
  if (days <= soonWithinDays) return { kind: "soon", days };
  return { kind: "later", days };
}
