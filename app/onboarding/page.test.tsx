import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Content } from "@/lib/content/repo";
import { buildPlan, type EngineStep, type PlanAnswers } from "@/lib/plan/build-plan";

// Regression for the Phase-9 onboarding bug: the page used to load the ~5
// committed fixtures directly (a Phase-4 stub), so the quiz preview computed an
// EMPTY plan while Home — reading the full corpus via `getContent` — showed the
// real one. The page must now source steps from the same repo Home uses.

const { getContent } = vi.hoisted(() => ({ getContent: vi.fn() }));
vi.mock("@/lib/content/repo", () => ({ getContent }));
// next-intl server helper is irrelevant here; the page only calls it in metadata.
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

/** A step that matches a "первые месяцы" persona but is NOT in the 5 fixtures. */
const fullContent = {
  source: "supabase",
  sections: [],
  steps: [
    {
      id: "1",
      slug: "ulpan-continue",
      section_slug: "hebrew",
      title: "Продолжить ульпан после алеф",
      summary: null,
      body_md: "…",
      docs: [],
      tips: [],
      cond: { stage: ["first_months", "settled"] },
      warn_rule: null,
      stage: "first_months",
      source_url: "https://gov.il",
      last_verified_at: "2026-01-01",
      sort_order: 1,
    },
  ],
} as unknown as Content;

const settledPersona: PlanAnswers = {
  stage: "first_months",
  basis: "jewish",
  family: "single",
  pet: false,
};

describe("OnboardingPage (regression: real content, not fixtures)", () => {
  it("passes the full getContent corpus to the quiz, yielding a non-empty preview plan", async () => {
    getContent.mockResolvedValue(fullContent);
    const { default: OnboardingPage } = await import("./page");

    const element = (await OnboardingPage()) as ReactElement<{ steps: EngineStep[] }>;
    const steps = element.props.steps;

    // The page sourced steps from the repo (real corpus), not the 5 fixtures.
    expect(getContent).toHaveBeenCalled();
    expect(steps.map((s) => s.slug)).toContain("ulpan-continue");

    // The quiz preview runs buildPlan client-side over exactly these steps — it
    // must now be non-empty (the bug produced an empty plan on fixtures).
    const plan = buildPlan(settledPersona, steps);
    expect(plan.entries.length).toBeGreaterThan(0);
    expect(plan.stepSlugs).toContain("ulpan-continue");
  });
});
