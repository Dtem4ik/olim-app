import { describe, expect, it } from "vitest";
import { matchContent, trigramSimilarity, wordSimilarity } from "./match";

const sections = [
  { slug: "banks-and-money", title: "Банки и деньги", icon: "landmark" },
  { slug: "healthcare", title: "Здоровье и больничная касса", icon: "heart" },
];

const steps = [
  {
    slug: "open-account",
    section_slug: "banks-and-money",
    title: "Открыть банковский счёт",
    summary: "Нужен теудат зеут и теудат оле.",
  },
  {
    slug: "kupat-holim",
    section_slug: "healthcare",
    title: "Записаться в купат холим",
    summary: "Выбрать больничную кассу в первые дни.",
  },
];

describe("trigram helpers", () => {
  it("scores identical words 1 and disjoint words low", () => {
    expect(trigramSimilarity("банк", "банк")).toBe(1);
    expect(trigramSimilarity("банк", "кошка")).toBeLessThan(0.2);
  });

  it("word_similarity survives a long multi-word title", () => {
    // Full-string similarity would dilute; per-word must stay high.
    expect(wordSimilarity("купат халим", "Записаться в купат холим")).toBeGreaterThan(0.5);
  });
});

describe("matchContent", () => {
  it("returns nothing for an empty query", () => {
    expect(matchContent("", sections, steps)).toEqual({ steps: [], sections: [] });
  });

  it("finds a step by an exact word", () => {
    const r = matchContent("банковский", sections, steps);
    expect(r.steps.map((s) => s.slug)).toContain("open-account");
  });

  it("finds by a partial word (substring)", () => {
    const r = matchContent("банк", sections, steps);
    expect(r.steps.map((s) => s.slug)).toContain("open-account");
    expect(r.sections.map((s) => s.slug)).toContain("banks-and-money");
  });

  it("tolerates a typo (купат халим → купат холим)", () => {
    const r = matchContent("купат халим", sections, steps);
    expect(r.steps.map((s) => s.slug)).toContain("kupat-holim");
  });

  it("matches a section by title", () => {
    const r = matchContent("здоровье", sections, steps);
    expect(r.sections.map((s) => s.slug)).toContain("healthcare");
  });

  it("carries the section title/icon onto step results", () => {
    const r = matchContent("банковский", sections, steps);
    const hit = r.steps.find((s) => s.slug === "open-account");
    expect(hit?.section_title).toBe("Банки и деньги");
    expect(hit?.section_icon).toBe("landmark");
  });

  it("respects the result limit", () => {
    const r = matchContent("теудат", sections, steps, 1);
    expect(r.steps.length).toBeLessThanOrEqual(1);
  });
});
