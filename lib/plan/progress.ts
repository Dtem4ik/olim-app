/**
 * Step progress store (Phase 4) — which steps the person has checked off.
 *
 * Keyed by step SLUG (stable across Supabase rows and fixtures). localStorage for
 * now; the module is intentionally small and pure so Phase 5 can swap the backend
 * for DB-backed plans without touching the UI. Versioned key for clean migration.
 */

export const PROGRESS_VERSION = 1;
export const PROGRESS_STORAGE_KEY = `olim.progress.v${PROGRESS_VERSION}`;

interface StoredProgress {
  version: typeof PROGRESS_VERSION;
  done: string[];
}

function isStored(value: unknown): value is StoredProgress {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as StoredProgress).version === PROGRESS_VERSION &&
    Array.isArray((value as StoredProgress).done) &&
    (value as StoredProgress).done.every((s) => typeof s === "string")
  );
}

/** Read the done-slug list from localStorage. Safe on the server. Never throws. */
export function loadProgress(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStored(parsed) ? parsed.done : [];
  } catch {
    return [];
  }
}

/** Persist the done-slug list. */
export function saveProgress(done: string[]): void {
  if (typeof window === "undefined") return;
  const payload: StoredProgress = { version: PROGRESS_VERSION, done };
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
}

/** Pure toggle: returns a new list with `slug` added or removed. */
export function toggleInList(done: string[], slug: string): string[] {
  return done.includes(slug) ? done.filter((s) => s !== slug) : [...done, slug];
}
