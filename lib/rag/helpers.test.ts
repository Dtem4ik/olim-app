import { afterEach, describe, expect, it } from "vitest";
import { ASK_RATE, geminiApiKey, isAiConfigured } from "./config";
import { buildStepEmbeddingText } from "./step-text";
import { type RetrievedStep, toSource } from "./types";

describe("buildStepEmbeddingText", () => {
  it("joins title + summary + body", () => {
    const out = buildStepEmbeddingText({ title: "T", summary: "S", body_md: "B" });
    expect(out).toBe("T\n\nS\n\nB");
  });

  it("omits an absent summary", () => {
    expect(buildStepEmbeddingText({ title: "T", summary: null, body_md: "B" })).toBe("T\n\nB");
  });

  it("caps oversized input at 8000 chars", () => {
    const out = buildStepEmbeddingText({ title: "T", body_md: "x".repeat(9000) });
    expect(out.length).toBe(8000);
  });
});

describe("toSource", () => {
  it("drops the body but keeps the card + provenance fields", () => {
    const step: RetrievedStep = {
      slug: "s",
      section_slug: "sec",
      title: "T",
      summary: "sum",
      section_title: "Sec",
      section_icon: "icon",
      source_url: "https://x",
      last_verified_at: "2026-01-01",
      body_md: "big body",
      score: 0.5,
    };
    const src = toSource(step);
    expect(src).toEqual({
      slug: "s",
      section_slug: "sec",
      title: "T",
      section_title: "Sec",
      section_icon: "icon",
      source_url: "https://x",
      last_verified_at: "2026-01-01",
    });
    expect("body_md" in src).toBe(false);
  });
});

describe("config", () => {
  const original = process.env.GEMINI_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  });

  it("isAiConfigured tracks the key presence", () => {
    process.env.GEMINI_API_KEY = "  key  ";
    expect(geminiApiKey()).toBe("key");
    expect(isAiConfigured()).toBe(true);
    process.env.GEMINI_API_KEY = "";
    expect(geminiApiKey()).toBeUndefined();
    expect(isAiConfigured()).toBe(false);
  });

  it("exposes numeric rate-limit caps", () => {
    expect(ASK_RATE.windowMs).toBe(60_000);
    expect(typeof ASK_RATE.global).toBe("number");
    expect(typeof ASK_RATE.perIp).toBe("number");
  });
});
