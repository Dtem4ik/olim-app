import { describe, expect, it } from "vitest";
import type { Cond, WarnRule } from "@/lib/content/schema";
import {
  buildPlan,
  computeWarning,
  type EngineStep,
  matchesCond,
  type PlanAnswers,
} from "./build-plan";

const answers = (over: Partial<PlanAnswers> = {}): PlanAnswers => ({
  stage: "just_landed",
  basis: "jewish",
  family: "single",
  pet: false,
  ...over,
});

const step = (over: Partial<EngineStep> = {}): EngineStep => ({
  slug: "s",
  section_slug: "sec",
  title: "T",
  sort_order: 0,
  cond: {},
  ...over,
});

const match = (cond: Cond, a: Partial<PlanAnswers> = {}) => matchesCond(cond, answers(a));

describe("matchesCond — no constraint", () => {
  it("empty cond matches everyone", () => {
    expect(match({})).toBe(true);
  });
});

describe("matchesCond — stage", () => {
  it("single value", () => {
    expect(match({ stage: "just_landed" })).toBe(true);
    expect(match({ stage: "settled" })).toBe(false);
  });
  it("list value", () => {
    expect(match({ stage: ["preparing", "just_landed"] })).toBe(true);
    expect(match({ stage: ["preparing", "settled"] })).toBe(false);
  });
});

describe("matchesCond — basis / family / pet", () => {
  it("basis", () => {
    expect(match({ basis: "jewish" })).toBe(true);
    expect(match({ basis: ["spouse", "grandchild_of_jew"] })).toBe(false);
  });
  it("family", () => {
    expect(match({ family: "single" })).toBe(true);
    expect(match({ family: "couple" })).toBe(false);
  });
  it("pet true/false must equal the answer", () => {
    expect(match({ pet: false })).toBe(true);
    expect(match({ pet: true })).toBe(false);
    expect(match({ pet: true }, { pet: true })).toBe(true);
  });
});

describe("matchesCond — country (needs an answer)", () => {
  it("no answer never matches a country condition", () => {
    expect(match({ country: "russia" })).toBe(false);
  });
  it("matches when the answer is in the list", () => {
    expect(match({ country: ["russia", "ukraine"] }, { country: "russia" })).toBe(true);
    expect(match({ country: "kazakhstan" }, { country: "russia" })).toBe(false);
  });
});

describe("matchesCond — children_ages range", () => {
  it("no children never matches", () => {
    expect(match({ children_ages: { min: 0, max: 6 } })).toBe(false);
  });
  it("matches when any child falls in the range", () => {
    expect(match({ children_ages: { min: 0, max: 6 } }, { childrenAges: [12, 4] })).toBe(true);
    expect(match({ children_ages: { min: 0, max: 6 } }, { childrenAges: [12, 18] })).toBe(false);
  });
  it("boundaries are inclusive; min-only and max-only", () => {
    expect(match({ children_ages: { min: 6 } }, { childrenAges: [6] })).toBe(true);
    expect(match({ children_ages: { max: 6 } }, { childrenAges: [6] })).toBe(true);
    expect(match({ children_ages: { min: 7 } }, { childrenAges: [6] })).toBe(false);
    expect(match({ children_ages: { max: 5 } }, { childrenAges: [6] })).toBe(false);
  });
});

describe("matchesCond — months_in_country range", () => {
  it("no answer never matches", () => {
    expect(match({ months_in_country: { min: 0, max: 6 } })).toBe(false);
  });
  it("respects inclusive bounds", () => {
    expect(match({ months_in_country: { min: 0, max: 6 } }, { monthsInCountry: 6 })).toBe(true);
    expect(match({ months_in_country: { min: 7 } }, { monthsInCountry: 6 })).toBe(false);
  });
});

describe("matchesCond — combinations", () => {
  it("all keys must pass together", () => {
    const cond: Cond = { stage: "just_landed", basis: "jewish", family: "single", pet: false };
    expect(match(cond)).toBe(true);
    expect(match({ ...cond, family: "couple" })).toBe(false);
  });
});

describe("computeWarning", () => {
  const now = new Date(2026, 6, 12); // 2026-07-12 local

  it("deadline_before_flight_days: due = flight − days", () => {
    const rule: WarnRule = { type: "deadline_before_flight_days", days: 10 };
    const w = computeWarning(rule, answers({ flightDate: "2026-08-01" }), now);
    expect(w.due).toBe("2026-07-22");
    expect(w.status?.kind).toBe("later");
  });

  it("deadline_after_arrival_days: due = arrival + days", () => {
    const rule: WarnRule = { type: "deadline_after_arrival_days", days: 90 };
    const w = computeWarning(rule, answers({ arrivalDate: "2026-07-01" }), now);
    expect(w.due).toBe("2026-09-29");
    expect(w.status?.kind).toBe("later");
  });

  it("expires_days also anchors on arrival", () => {
    const rule: WarnRule = { type: "expires_days", days: 30 };
    const w = computeWarning(rule, answers({ arrivalDate: "2026-06-01" }), now);
    expect(w.due).toBe("2026-07-01");
    expect(w.status?.kind).toBe("overdue"); // 2026-07-01 is before now (07-12)
  });

  it("null due/status when the anchor date is missing", () => {
    const flight: WarnRule = { type: "deadline_before_flight_days", days: 5 };
    expect(computeWarning(flight, answers(), now)).toMatchObject({ due: null, status: null });
    const arrival: WarnRule = { type: "deadline_after_arrival_days", days: 5 };
    expect(computeWarning(arrival, answers(), now)).toMatchObject({ due: null, status: null });
  });

  it("date-math edges: today and overdue", () => {
    const rule: WarnRule = { type: "deadline_after_arrival_days", days: 0 };
    const today = computeWarning(rule, answers({ arrivalDate: "2026-07-12" }), now);
    expect(today.status?.kind).toBe("today");
    const past = computeWarning(rule, answers({ arrivalDate: "2026-07-10" }), now);
    expect(past.status?.kind).toBe("overdue");
  });
});

describe("buildPlan", () => {
  const steps: EngineStep[] = [
    step({ slug: "settle-a", stage: "settled", sort_order: 1 }),
    step({ slug: "prep-b", stage: "preparing", sort_order: 2 }),
    step({ slug: "prep-a", stage: "preparing", sort_order: 1 }),
    step({ slug: "no-stage", stage: null, sort_order: 5 }),
    step({ slug: "land-a", stage: "just_landed", sort_order: 1 }),
    step({ slug: "couples-only", stage: "preparing", sort_order: 0, cond: { family: "couple" } }),
  ];

  it("filters by cond, sorts by stage → sort_order, groups by stage", () => {
    const plan = buildPlan(answers(), steps, new Date(2026, 6, 12));
    // couples-only filtered out for a single person.
    expect(plan.stepSlugs).toEqual(["prep-a", "prep-b", "land-a", "settle-a", "no-stage"]);
    expect(plan.stages.map((g) => g.stage)).toEqual(["preparing", "just_landed", "settled", null]);
    expect(plan.stages[0]?.entries).toHaveLength(2);
  });

  it("tie-breaks equal stage+sort_order by slug", () => {
    const tied = [
      step({ slug: "b", stage: "preparing", sort_order: 1 }),
      step({ slug: "a", stage: "preparing", sort_order: 1 }),
    ];
    expect(buildPlan(answers(), tied).stepSlugs).toEqual(["a", "b"]);
  });

  it("attaches a warning only when the step has a warn_rule", () => {
    const withRule = [
      step({
        slug: "warned",
        stage: "just_landed",
        warn_rule: { type: "deadline_after_arrival_days", days: 90 },
      }),
      step({ slug: "plain", stage: "just_landed" }),
    ];
    const plan = buildPlan(answers({ arrivalDate: "2026-07-01" }), withRule, new Date(2026, 6, 12));
    const warned = plan.entries.find((e) => e.step.slug === "warned");
    const plain = plan.entries.find((e) => e.step.slug === "plain");
    expect(warned?.warning?.due).toBe("2026-09-29");
    expect(plain?.warning).toBeNull();
  });

  it("empty step set yields an empty plan", () => {
    const plan = buildPlan(answers(), []);
    expect(plan.entries).toEqual([]);
    expect(plan.stages).toEqual([]);
    expect(plan.stepSlugs).toEqual([]);
  });
});
