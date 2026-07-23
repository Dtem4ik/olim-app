import { describe, expect, it } from "vitest";
import { fuseRankings } from "./fuse";

type Ranked = { slug: string; score: number };
/** Score at a position, or NaN when out of range — keeps assertions non-null-safe. */
const scoreAt = (out: Ranked[], i: number): number => out[i]?.score ?? Number.NaN;

describe("fuseRankings (RRF)", () => {
  it("returns an empty ranking for no lists / empty lists", () => {
    expect(fuseRankings([])).toEqual([]);
    expect(fuseRankings([[], []])).toEqual([]);
  });

  it("ranks a single list by position", () => {
    const out = fuseRankings([["a", "b", "c"]]);
    expect(out.map((r) => r.slug)).toEqual(["a", "b", "c"]);
    expect(scoreAt(out, 0)).toBeGreaterThan(scoreAt(out, 1));
  });

  it("rewards agreement across lists (an item high in both wins)", () => {
    // 'b' is 2nd in list 1 and 1st in list 2 → beats 'a' (1st, then absent).
    const out = fuseRankings([
      ["a", "b", "c"],
      ["b", "c", "a"],
    ]);
    expect(out[0]?.slug).toBe("b");
  });

  it("dedupes slugs across lists into a single fused score", () => {
    const out = fuseRankings([
      ["a", "b"],
      ["a", "c"],
    ]);
    expect(out.filter((r) => r.slug === "a")).toHaveLength(1);
    // 'a' appears in both lists → highest.
    expect(out[0]?.slug).toBe("a");
  });

  it("a smaller k sharpens the advantage of top ranks", () => {
    const sharp = fuseRankings([["a", "b"]], 1);
    const flat = fuseRankings([["a", "b"]], 1000);
    const sharpGap = scoreAt(sharp, 0) - scoreAt(sharp, 1);
    const flatGap = scoreAt(flat, 0) - scoreAt(flat, 1);
    expect(sharpGap).toBeGreaterThan(flatGap);
  });

  it("skips sparse holes without throwing", () => {
    const out = fuseRankings([["a", "b", "c"]]);
    expect(out).toHaveLength(3);
  });
});
