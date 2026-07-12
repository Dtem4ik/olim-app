/**
 * Reference-persona snapshots (Phase 3 DoD). A small step set that exercises
 * every cond dimension, run against 6 personas, asserting the exact plan per
 * persona and that the plans differ meaningfully. The "answers → size → slugs"
 * table is reproduced in docs/PHASE_REPORTS/phase-3.md.
 */

import { describe, expect, it } from "vitest";
import { buildPlan, type EngineStep, type PlanAnswers } from "./build-plan";

const steps: EngineStep[] = [
  {
    slug: "universal-first-steps",
    section_slug: "start",
    title: "Первые шаги",
    stage: "preparing",
    sort_order: 1,
    cond: {},
  },
  {
    slug: "prep-documents",
    section_slug: "start",
    title: "Документы",
    stage: "preparing",
    sort_order: 2,
    cond: { stage: "preparing" },
  },
  {
    slug: "prep-grandchild-archive",
    section_slug: "start",
    title: "Архивная цепочка",
    stage: "preparing",
    sort_order: 3,
    cond: { stage: "preparing", basis: "grandchild_of_jew" },
  },
  {
    slug: "prep-pet-import",
    section_slug: "start",
    title: "Ввоз питомца",
    stage: "preparing",
    sort_order: 4,
    cond: { pet: true },
  },
  {
    slug: "nativ-check",
    section_slug: "start",
    title: "Проверка Натив",
    stage: "preparing",
    sort_order: 5,
    cond: { stage: "preparing", country: ["russia", "ukraine", "kazakhstan"] },
  },
  {
    slug: "land-bank",
    section_slug: "banks",
    title: "Счёт в банке",
    stage: "just_landed",
    sort_order: 1,
    cond: { stage: "just_landed" },
  },
  {
    slug: "land-kupat",
    section_slug: "health",
    title: "Больничная касса",
    stage: "just_landed",
    sort_order: 2,
    cond: { stage: "just_landed" },
    warn_rule: { type: "deadline_after_arrival_days", days: 90 },
  },
  {
    slug: "ulpan",
    section_slug: "hebrew",
    title: "Ульпан",
    stage: "first_months",
    sort_order: 1,
    cond: { stage: ["first_months", "settled"] },
  },
  {
    slug: "kids-school",
    section_slug: "family",
    title: "Школа/сад",
    stage: "first_months",
    sort_order: 2,
    cond: { family: ["with_children", "single_parent"], children_ages: { min: 3, max: 18 } },
  },
  {
    slug: "single-parent-support",
    section_slug: "benefits",
    title: "Поддержка родителя-одиночки",
    stage: "first_months",
    sort_order: 3,
    cond: { family: "single_parent" },
  },
  {
    slug: "rent-assistance",
    section_slug: "rent",
    title: "Помощь на аренду",
    stage: "settled",
    sort_order: 1,
    cond: { stage: "settled", months_in_country: { min: 12 } },
  },
  {
    slug: "returning-citizen-note",
    section_slug: "benefits",
    title: "Вернувшийся гражданин",
    stage: "settled",
    sort_order: 2,
    cond: { basis: "returning_citizen" },
  },
  {
    slug: "everyone-hebrew-tip",
    section_slug: "hebrew",
    title: "Совет: учи иврит",
    stage: null,
    sort_order: 9,
    cond: {},
  },
];

const NOW = new Date(2026, 6, 12);

const personas: Record<string, PlanAnswers> = {
  "single preparing (RU)": {
    stage: "preparing",
    basis: "jewish",
    family: "single",
    pet: false,
    country: "russia",
    flightDate: "2026-09-01",
  },
  "family w/ kids just landed (KZ)": {
    stage: "just_landed",
    basis: "jewish",
    family: "with_children",
    pet: false,
    country: "kazakhstan",
    childrenAges: [7, 10],
    arrivalDate: "2026-07-01",
  },
  "grandchild_of_jew preparing (RU)": {
    stage: "preparing",
    basis: "grandchild_of_jew",
    family: "couple",
    pet: false,
    country: "russia",
    flightDate: "2026-10-01",
  },
  "spouse settled 8 months": {
    stage: "settled",
    basis: "spouse",
    family: "couple",
    pet: false,
    monthsInCountry: 8,
    arrivalDate: "2025-11-01",
  },
  "single_parent w/ pet just landed": {
    stage: "just_landed",
    basis: "jewish",
    family: "single_parent",
    pet: true,
    childrenAges: [4],
    arrivalDate: "2026-07-05",
  },
  "returning_citizen first months": {
    stage: "first_months",
    basis: "returning_citizen",
    family: "single",
    pet: false,
    monthsInCountry: 3,
    arrivalDate: "2026-05-01",
  },
};

const expected: Record<string, string[]> = {
  "single preparing (RU)": [
    "universal-first-steps",
    "prep-documents",
    "nativ-check",
    "everyone-hebrew-tip",
  ],
  "family w/ kids just landed (KZ)": [
    "universal-first-steps",
    "land-bank",
    "land-kupat",
    "kids-school",
    "everyone-hebrew-tip",
  ],
  "grandchild_of_jew preparing (RU)": [
    "universal-first-steps",
    "prep-documents",
    "prep-grandchild-archive",
    "nativ-check",
    "everyone-hebrew-tip",
  ],
  "spouse settled 8 months": ["universal-first-steps", "ulpan", "everyone-hebrew-tip"],
  "single_parent w/ pet just landed": [
    "universal-first-steps",
    "prep-pet-import",
    "land-bank",
    "land-kupat",
    "kids-school",
    "single-parent-support",
    "everyone-hebrew-tip",
  ],
  "returning_citizen first months": [
    "universal-first-steps",
    "ulpan",
    "returning-citizen-note",
    "everyone-hebrew-tip",
  ],
};

describe("reference personas", () => {
  for (const [name, answers] of Object.entries(personas)) {
    it(`${name} → ${expected[name]?.length} steps`, () => {
      expect(buildPlan(answers, steps, NOW).stepSlugs).toEqual(expected[name]);
    });
  }

  it("every persona's plan is distinct from the others", () => {
    const sigs = Object.values(personas).map((a) => buildPlan(a, steps, NOW).stepSlugs.join("|"));
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it("warnings ride along where a warn_rule + arrival date exist", () => {
    const plan = buildPlan(personas["family w/ kids just landed (KZ)"] as PlanAnswers, steps, NOW);
    const kupat = plan.entries.find((e) => e.step.slug === "land-kupat");
    expect(kupat?.warning?.due).toBe("2026-09-29"); // 2026-07-01 + 90d
  });
});
