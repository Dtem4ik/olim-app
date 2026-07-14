/**
 * Minimal fixed-window rate limiter (Phase 5).
 *
 * Deliberately dependency-free and in-memory: the shared Supabase project has no
 * Redis/Upstash and the abuse surface here is tiny (anonymous "report outdated"
 * and "share plan" writes). The pure `hitWindow` core is unit-tested; the
 * module-level `rateLimit` wraps it over a process-local Map. In-memory state is
 * per-instance and resets on cold start — acceptable for coarse anti-spam, not a
 * security boundary (RLS + DB CHECK constraints are the real guards).
 */

export interface RateLimitResult {
  /** True when the hit is allowed (under the limit for the current window). */
  ok: boolean;
  /** Hits remaining in the current window after this one. */
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
}

export interface WindowState {
  count: number;
  resetAt: number;
}

/**
 * Pure fixed-window step. Returns the next state and whether the hit is allowed.
 * A window that has expired (`now >= resetAt`) restarts at 1.
 */
export function hitWindow(
  prev: WindowState | undefined,
  now: number,
  limit: number,
  windowMs: number,
): { state: WindowState; result: RateLimitResult } {
  if (!prev || now >= prev.resetAt) {
    const state = { count: 1, resetAt: now + windowMs };
    return { state, result: { ok: true, remaining: limit - 1, resetAt: state.resetAt } };
  }
  const count = prev.count + 1;
  const state = { count, resetAt: prev.resetAt };
  return {
    state,
    result: { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt: prev.resetAt },
  };
}

const store = new Map<string, WindowState>();

/** Occasionally drop expired windows so the Map cannot grow unbounded. */
function sweep(now: number): void {
  if (store.size < 512) return;
  for (const [key, state] of store) {
    if (now >= state.resetAt) store.delete(key);
  }
}

/**
 * Record a hit for `key` against a fixed window and report whether it is allowed.
 * `key` should namespace the action and the client (e.g. `report:1.2.3.4`).
 */
export function rateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: { limit: number; windowMs: number; now?: number },
): RateLimitResult {
  sweep(now);
  const { state, result } = hitWindow(store.get(key), now, limit, windowMs);
  store.set(key, state);
  return result;
}

/** Test-only: clear the shared window store. */
export function __resetRateLimitStore(): void {
  store.clear();
}
