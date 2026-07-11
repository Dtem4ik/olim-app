import { describe, expect, it } from "vitest";
import type { ContentBundle } from "./bundle";
import { lintBundle } from "./lint";
import { benefitInputSchema, stepInputSchema } from "./schema";

const NOW = new Date("2026-07-11T12:00:00Z");

function bundleWithStep(overrides: Record<string, unknown>): ContentBundle {
  const stepBase = {
    slug: "s",
    section_slug: "banks",
    title: "Title",
    body_md: "body",
    source_url: "https://www.gov.il/x",
    last_verified_at: "2026-07-11",
    ...overrides,
  };
  return { sections: [], steps: [stepInputSchema.parse(stepBase)], benefits: [] };
}

function codes(bundle: ContentBundle): string[] {
  return lintBundle(bundle, NOW).map((i) => i.code);
}

describe("source_url allowlist", () => {
  it.each([
    "https://www.gov.il/he/x",
    "https://www.health.gov.il/x",
    "https://www.btl.gov.il/x",
    "https://www.kolzchut.org.il/he/x",
    "https://www.jewishagency.org/x",
  ])("accepts trusted %s", (source_url) => {
    expect(codes(bundleWithStep({ source_url }))).not.toContain("untrusted-source");
  });

  it.each([
    "https://example.com/x",
    "https://gov.il.evil.com/x",
    "https://notgov.il/x",
  ])("rejects untrusted %s", (source_url) => {
    expect(codes(bundleWithStep({ source_url }))).toContain("untrusted-source");
  });
});

describe("banned phrases", () => {
  it.each([
    { field: "body_md", value: "This is guaranteed to work" },
    { field: "summary", value: "Мы гарантируем результат" },
    { field: "body_md", value: "100% approval, обещаем" },
    { field: "body_md", value: "это юридическая консультация" },
  ])("flags $value", ({ field, value }) => {
    expect(codes(bundleWithStep({ [field]: value }))).toContain("banned-phrase");
  });

  it("passes clean copy", () => {
    expect(codes(bundleWithStep({ body_md: "Проверь на официальном сайте." }))).not.toContain(
      "banned-phrase",
    );
  });

  it("scans tips and docs too", () => {
    const bundle = bundleWithStep({
      tips: [{ text: "we guarantee it" }],
      docs: [{ label: "паспорт" }],
    });
    expect(codes(bundle)).toContain("banned-phrase");
  });
});

describe("last_verified_at freshness", () => {
  it("flags a future date", () => {
    expect(codes(bundleWithStep({ last_verified_at: "2026-08-01" }))).toContain("future-date");
  });
  it("warns on a stale date", () => {
    expect(codes(bundleWithStep({ last_verified_at: "2025-01-01" }))).toContain("stale-source");
  });
  it("accepts a recent date", () => {
    const result = codes(bundleWithStep({ last_verified_at: "2026-07-01" }));
    expect(result).not.toContain("future-date");
    expect(result).not.toContain("stale-source");
  });
});

describe("benefits are linted too", () => {
  it("flags an untrusted benefit source and a banned phrase", () => {
    const benefit = benefitInputSchema.parse({
      slug: "sal-klita",
      title: "Гарантируем выплату",
      valid_from: "2026-01-01",
      source_url: "https://example.com/x",
      last_verified_at: "2026-07-11",
    });
    const bundle: ContentBundle = { sections: [], steps: [], benefits: [benefit] };
    const result = codes(bundle);
    expect(result).toContain("untrusted-source");
    expect(result).toContain("banned-phrase");
  });
});
