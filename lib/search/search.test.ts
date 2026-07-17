import { beforeEach, describe, expect, it, vi } from "vitest";

// getSupabaseAnon is swapped per test: null → fixtures fallback; a fake client → DB path.
const getAnon = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ getSupabaseAnon: () => getAnon() }));

import { searchContent } from "./search";

/**
 * Minimal Supabase-client stand-in. `select()` returns a thenable that also chains
 * `.order()`, matching how both searchContent and the getContent fallback query.
 */
function fakeClient(opts: {
  rpc: { data: unknown; error: unknown };
  sections?: unknown[];
  steps?: unknown[];
}) {
  // A real Promise (awaitable directly) that also chains `.order()`.
  const sel = (rows: unknown[]) => {
    const res = { data: rows, error: null };
    const p = Promise.resolve(res) as Promise<typeof res> & { order: () => Promise<typeof res> };
    p.order = () => Promise.resolve(res);
    return p;
  };
  return {
    rpc: async () => opts.rpc,
    from: (table: string) => ({
      select: () => sel(table === "steps" ? (opts.steps ?? []) : (opts.sections ?? [])),
    }),
  };
}

beforeEach(() => getAnon.mockReset());

describe("searchContent", () => {
  it("returns empty for a blank query without touching the DB", async () => {
    const r = await searchContent("   ");
    expect(r).toEqual({ steps: [], sections: [], source: "fixtures" });
    expect(getAnon).not.toHaveBeenCalled();
  });

  it("falls back to the fixtures matcher when no stack is configured", async () => {
    getAnon.mockReturnValue(null);
    const r = await searchContent("банк");
    expect(r.source).toBe("fixtures");
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it("uses the DB RPC + section match when a client is available", async () => {
    getAnon.mockReturnValue(
      fakeClient({
        rpc: {
          data: [
            {
              slug: "open-account",
              section_slug: "banks-and-money",
              title: "Открыть счёт",
              summary: null,
              section_title: "Банки и деньги",
              section_icon: "landmark",
              rank: 1.2,
            },
          ],
          error: null,
        },
        sections: [{ slug: "banks-and-money", title: "Банки и деньги", icon: "landmark" }],
      }),
    );
    const r = await searchContent("банк");
    expect(r.source).toBe("supabase");
    expect(r.steps[0]?.slug).toBe("open-account");
    expect(r.sections.map((s) => s.slug)).toContain("banks-and-money");
  });

  it("falls back to fixtures when the RPC errors (migration not applied)", async () => {
    getAnon.mockReturnValue(
      fakeClient({ rpc: { data: null, error: { message: "function does not exist" } } }),
    );
    const r = await searchContent("банк");
    expect(r.source).toBe("fixtures");
  });
});
