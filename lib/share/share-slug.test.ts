import { describe, expect, it } from "vitest";
import { generateShareSlug, isShareSlug } from "./share-slug";

describe("generateShareSlug", () => {
  it("defaults to 16 URL-safe chars", () => {
    const slug = generateShareSlug();
    expect(slug).toHaveLength(16);
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("honours a custom size", () => {
    expect(generateShareSlug(24)).toHaveLength(24);
  });

  it("rejects sizes below the 12-char security minimum", () => {
    expect(() => generateShareSlug(8)).toThrow();
  });

  it("is practically unique across many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateShareSlug());
    expect(seen.size).toBe(1000);
  });
});

describe("isShareSlug", () => {
  it("accepts well-formed slugs", () => {
    expect(isShareSlug(generateShareSlug())).toBe(true);
    expect(isShareSlug("abcABC123_-xy")).toBe(true);
  });

  it("rejects short or invalid slugs", () => {
    expect(isShareSlug("tooShort")).toBe(false);
    expect(isShareSlug("has spaces here")).toBe(false);
    expect(isShareSlug("emoji😀emoji12")).toBe(false);
  });
});
