import { beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimitStore, hitWindow, rateLimit, type WindowState } from "./rate-limit";

describe("hitWindow (pure)", () => {
  it("starts a fresh window on first hit", () => {
    const { state, result } = hitWindow(undefined, 1_000, 3, 60_000);
    expect(result).toEqual({ ok: true, remaining: 2, resetAt: 61_000 });
    expect(state).toEqual({ count: 1, resetAt: 61_000 });
  });

  it("counts within a window and blocks once over the limit", () => {
    let prev: WindowState | undefined;
    const results = [];
    for (let i = 0; i < 4; i++) {
      const step = hitWindow(prev, 1_000 + i, 3, 60_000);
      prev = step.state;
      results.push(step.result.ok);
    }
    expect(results).toEqual([true, true, true, false]);
  });

  it("resets when the window has expired", () => {
    const prev: WindowState = { count: 3, resetAt: 10_000 };
    const { result } = hitWindow(prev, 10_000, 3, 60_000);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("floors remaining at zero", () => {
    const prev: WindowState = { count: 9, resetAt: 60_000 };
    const { result } = hitWindow(prev, 1_000, 3, 60_000);
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("rateLimit (shared store)", () => {
  beforeEach(() => __resetRateLimitStore());

  it("allows up to the limit then blocks, per key", () => {
    const opts = { limit: 2, windowMs: 60_000, now: 1_000 };
    expect(rateLimit("a", opts).ok).toBe(true);
    expect(rateLimit("a", opts).ok).toBe(true);
    expect(rateLimit("a", opts).ok).toBe(false);
    // A different key has its own window.
    expect(rateLimit("b", opts).ok).toBe(true);
  });

  it("allows again after the window rolls over", () => {
    expect(rateLimit("a", { limit: 1, windowMs: 1_000, now: 0 }).ok).toBe(true);
    expect(rateLimit("a", { limit: 1, windowMs: 1_000, now: 500 }).ok).toBe(false);
    expect(rateLimit("a", { limit: 1, windowMs: 1_000, now: 1_000 }).ok).toBe(true);
  });
});
