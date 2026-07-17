import { describe, expect, it } from "vitest";
import { sectionColor } from "@/lib/section-colors";

describe("sectionColor", () => {
  it("pins known sections to stable pastel classes", () => {
    expect(sectionColor("banks-and-money")).toBe("bg-sec-sky");
    expect(sectionColor("healthcare")).toBe("bg-sec-mint");
    expect(sectionColor("olim-benefits")).toBe("bg-sec-amber");
    expect(sectionColor("hebrew-ulpan")).toBe("bg-sec-peach");
  });

  it("hashes unknown slugs deterministically into the palette", () => {
    const c = sectionColor("some-unknown-section");
    expect(c).toMatch(/^bg-sec-/);
    // Stable across calls.
    expect(sectionColor("some-unknown-section")).toBe(c);
  });
});
