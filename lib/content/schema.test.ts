import { describe, expect, it } from "vitest";
import {
  benefitInputSchema,
  condSchema,
  dateSchema,
  httpsUrlSchema,
  rangeSchema,
  sectionInputSchema,
  slugSchema,
  stepInputSchema,
  stepReportInputSchema,
  warnRuleSchema,
} from "./schema";

describe("slugSchema", () => {
  it.each([
    "banks",
    "banks-and-money",
    "open-bank-account",
    "a1",
    "kupat-holim-2026",
  ])("accepts %s", (s) => {
    expect(slugSchema.safeParse(s).success).toBe(true);
  });

  it.each([
    "Banks",
    "banks_money",
    "-banks",
    "banks-",
    "banks--money",
    "",
    "рент",
  ])("rejects %s", (s) => {
    expect(slugSchema.safeParse(s).success).toBe(false);
  });
});

describe("httpsUrlSchema", () => {
  it("accepts https URLs", () => {
    expect(httpsUrlSchema.safeParse("https://gov.il/x").success).toBe(true);
  });
  it("rejects http URLs", () => {
    expect(httpsUrlSchema.safeParse("http://gov.il/x").success).toBe(false);
  });
  it("rejects non-URLs", () => {
    expect(httpsUrlSchema.safeParse("gov.il").success).toBe(false);
  });
});

describe("dateSchema", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(dateSchema.safeParse("2026-07-11").success).toBe(true);
  });
  it.each(["2026-7-11", "11-07-2026", "2026/07/11", "not-a-date"])("rejects %s", (d) => {
    expect(dateSchema.safeParse(d).success).toBe(false);
  });
});

describe("rangeSchema", () => {
  it("accepts a min-only range", () => {
    expect(rangeSchema.safeParse({ min: 0 }).success).toBe(true);
  });
  it("accepts a max-only range", () => {
    expect(rangeSchema.safeParse({ max: 18 }).success).toBe(true);
  });
  it("accepts min ≤ max", () => {
    expect(rangeSchema.safeParse({ min: 3, max: 18 }).success).toBe(true);
  });
  it("rejects an empty range", () => {
    expect(rangeSchema.safeParse({}).success).toBe(false);
  });
  it("rejects min > max", () => {
    expect(rangeSchema.safeParse({ min: 18, max: 3 }).success).toBe(false);
  });
  it("rejects negative bounds", () => {
    expect(rangeSchema.safeParse({ min: -1 }).success).toBe(false);
  });
});

describe("condSchema", () => {
  it("accepts an empty object (no constraint)", () => {
    expect(condSchema.safeParse({}).success).toBe(true);
  });
  it("accepts a single value or a list for the same key", () => {
    expect(condSchema.safeParse({ stage: "just_landed" }).success).toBe(true);
    expect(condSchema.safeParse({ stage: ["just_landed", "first_months"] }).success).toBe(true);
  });
  it("accepts a full condition", () => {
    const result = condSchema.safeParse({
      stage: ["just_landed", "first_months"],
      basis: "jewish",
      country: ["russia", "ukraine"],
      family: "with_children",
      pet: true,
      children_ages: { min: 0, max: 6 },
      months_in_country: { max: 6 },
    });
    expect(result.success).toBe(true);
  });
  it("rejects unknown keys (strict)", () => {
    expect(condSchema.safeParse({ city: "haifa" }).success).toBe(false);
  });
  it("rejects an invalid enum value", () => {
    expect(condSchema.safeParse({ stage: "landed" }).success).toBe(false);
  });
  it("rejects an empty option list", () => {
    expect(condSchema.safeParse({ stage: [] }).success).toBe(false);
  });
});

describe("warnRuleSchema", () => {
  it.each([
    { type: "expires_days", days: 90 },
    { type: "deadline_before_flight_days", days: 14 },
    { type: "deadline_after_arrival_days", days: 30, label: "register with kupat holim" },
  ])("accepts %o", (rule) => {
    expect(warnRuleSchema.safeParse(rule).success).toBe(true);
  });
  it("rejects an unknown type", () => {
    expect(warnRuleSchema.safeParse({ type: "expires_hours", days: 1 }).success).toBe(false);
  });
  it("rejects non-positive days", () => {
    expect(warnRuleSchema.safeParse({ type: "expires_days", days: 0 }).success).toBe(false);
    expect(warnRuleSchema.safeParse({ type: "expires_days", days: -5 }).success).toBe(false);
  });
});

describe("sectionInputSchema", () => {
  it("defaults sort_order to 0", () => {
    const parsed = sectionInputSchema.parse({ slug: "banks", title: "Банки и деньги" });
    expect(parsed.sort_order).toBe(0);
  });
  it("rejects a title over 120 chars", () => {
    expect(sectionInputSchema.safeParse({ slug: "banks", title: "x".repeat(121) }).success).toBe(
      false,
    );
  });
});

describe("stepInputSchema", () => {
  const base = {
    slug: "open-bank-account",
    section_slug: "banks",
    title: "Как открыть счёт",
    body_md: "Короткий ответ, потом шаги.",
    source_url: "https://www.gov.il/x",
    last_verified_at: "2026-07-11",
  };

  it("applies defaults for optional collections and flags", () => {
    const parsed = stepInputSchema.parse(base);
    expect(parsed.docs).toEqual([]);
    expect(parsed.tips).toEqual([]);
    expect(parsed.cond).toEqual({});
    expect(parsed.needs_review).toBe(true);
    expect(parsed.sort_order).toBe(0);
  });

  it("parses a fully-specified step", () => {
    const parsed = stepInputSchema.parse({
      ...base,
      summary: "Открыть счёт можно в день прилёта.",
      docs: [{ label: "Теудат оле", required: true }],
      warn_rule: { type: "deadline_after_arrival_days", days: 30 },
      tips: [{ text: "Лучше идти утром", author: "оле 2025" }],
      cond: { stage: "just_landed" },
      stage: "just_landed",
      needs_review: false,
    });
    expect(parsed.needs_review).toBe(false);
    expect(parsed.warn_rule).toMatchObject({ type: "deadline_after_arrival_days", days: 30 });
  });

  it("rejects an http source_url", () => {
    expect(stepInputSchema.safeParse({ ...base, source_url: "http://gov.il" }).success).toBe(false);
  });
  it("rejects an empty body", () => {
    expect(stepInputSchema.safeParse({ ...base, body_md: "" }).success).toBe(false);
  });
  it("rejects a body over 8000 chars", () => {
    expect(stepInputSchema.safeParse({ ...base, body_md: "x".repeat(8001) }).success).toBe(false);
  });
  it("rejects a bad cond key", () => {
    expect(stepInputSchema.safeParse({ ...base, cond: { city: "haifa" } }).success).toBe(false);
  });
});

describe("benefitInputSchema", () => {
  const base = {
    slug: "sal-klita-single-adult",
    title: "Сал клита — одинокий взрослый",
    amount: 1250.5,
    valid_from: "2026-01-01",
    source_url: "https://www.gov.il/x",
    last_verified_at: "2026-07-11",
  };

  it("defaults currency to ILS and meta to {}", () => {
    const parsed = benefitInputSchema.parse(base);
    expect(parsed.currency).toBe("ILS");
    expect(parsed.meta).toEqual({});
  });
  it("rejects a currency that is not 3 chars", () => {
    expect(benefitInputSchema.safeParse({ ...base, currency: "SHEKEL" }).success).toBe(false);
  });
  it("accepts valid_to on or after valid_from", () => {
    expect(benefitInputSchema.safeParse({ ...base, valid_to: "2026-12-31" }).success).toBe(true);
  });
  it("rejects valid_to before valid_from", () => {
    expect(benefitInputSchema.safeParse({ ...base, valid_to: "2025-12-31" }).success).toBe(false);
  });
});

describe("stepReportInputSchema", () => {
  it("accepts a known reason", () => {
    expect(
      stepReportInputSchema.safeParse({
        step_id: "00000000-0000-0000-0000-000000000000",
        reason: "outdated",
      }).success,
    ).toBe(true);
  });
  it("rejects an unknown reason", () => {
    expect(
      stepReportInputSchema.safeParse({
        step_id: "00000000-0000-0000-0000-000000000000",
        reason: "spam",
      }).success,
    ).toBe(false);
  });
  it("rejects a non-uuid step_id", () => {
    expect(stepReportInputSchema.safeParse({ step_id: "123", reason: "other" }).success).toBe(
      false,
    );
  });
});
