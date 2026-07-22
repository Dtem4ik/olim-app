import { describe, expect, it } from "vitest";
import { buildUserPrompt, NO_ANSWER_TOKEN, parseAnswer } from "./prompt";
import type { RetrievedStep } from "./types";

const step = (over: Partial<RetrievedStep> = {}): RetrievedStep => ({
  slug: "open-bank-account",
  section_slug: "banks-and-money",
  title: "Открыть счёт",
  summary: "Нужен теудат зеут.",
  section_title: "Банки и деньги",
  section_icon: null,
  source_url: "https://gov.il/x",
  last_verified_at: "2026-01-01",
  body_md: "Тело шага.",
  score: 1,
  ...over,
});

describe("buildUserPrompt", () => {
  it("numbers each step and includes slug, section, source, and body", () => {
    const out = buildUserPrompt("как открыть счёт?", [step()]);
    expect(out).toContain("[Step 1] slug: open-bank-account");
    expect(out).toContain("Section: Банки и деньги");
    expect(out).toContain("Official source: https://gov.il/x (verified 2026-01-01)");
    expect(out).toContain("QUESTION: как открыть счёт?");
  });

  it("caps an oversized body", () => {
    const out = buildUserPrompt("q", [step({ body_md: "x".repeat(5000) })]);
    expect(out).toContain("…");
    expect(out.length).toBeLessThan(5000 + 500);
  });
});

describe("parseAnswer", () => {
  const known = ["open-bank-account", "register-kupat-holim"];

  it("strips the SOURCES line and returns cited slugs", () => {
    const raw = "Открой счёт в банке.\nSOURCES: open-bank-account";
    const { answer, refused, citedSlugs } = parseAnswer(raw, known);
    expect(answer).toBe("Открой счёт в банке.");
    expect(refused).toBe(false);
    expect(citedSlugs).toEqual(["open-bank-account"]);
  });

  it("drops fabricated slugs not present in the context", () => {
    const raw = "Ответ.\nSOURCES: open-bank-account, invented-slug";
    expect(parseAnswer(raw, known).citedSlugs).toEqual(["open-bank-account"]);
  });

  it("detects the bare NO_ANSWER refusal token", () => {
    expect(parseAnswer(NO_ANSWER_TOKEN, known)).toEqual({
      answer: "",
      refused: true,
      citedSlugs: [],
    });
  });

  it("treats an empty answer as a refusal", () => {
    expect(parseAnswer("   \n  ", known).refused).toBe(true);
  });

  it("parses multiple comma/space separated slugs and dedupes", () => {
    const raw = "Ответ.\nSOURCES: open-bank-account register-kupat-holim, open-bank-account";
    expect(parseAnswer(raw, known).citedSlugs).toEqual([
      "open-bank-account",
      "register-kupat-holim",
    ]);
  });

  it("returns no citations when the SOURCES line is absent", () => {
    const { citedSlugs, refused } = parseAnswer("Просто ответ без источников.", known);
    expect(refused).toBe(false);
    expect(citedSlugs).toEqual([]);
  });
});
