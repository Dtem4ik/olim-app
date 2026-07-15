import { describe, expect, it } from "vitest";
import type { Profile } from "@/lib/plan/profile";
import {
  sharedAnswersSchema,
  sharedDoneSchema,
  toPlanAnswers,
  toSharedAnswers,
} from "./shared-plan";

const fullProfile: Profile = {
  version: 1,
  stage: "just_landed",
  basis: "jewish",
  country: "russia",
  family: "with_children",
  pet: false,
  childrenAges: [7, 10],
  monthsInCountry: 2,
  city: "Хайфа",
  arrivalDate: "2026-05-01",
  flightDate: "2026-04-20",
};

describe("toSharedAnswers", () => {
  it("drops city, dates and the version tag (privacy)", () => {
    const shared = toSharedAnswers(fullProfile);
    expect(shared).toEqual({
      stage: "just_landed",
      basis: "jewish",
      country: "russia",
      family: "with_children",
      pet: false,
      childrenAges: [7, 10],
      monthsInCountry: 2,
    });
    expect(shared).not.toHaveProperty("city");
    expect(shared).not.toHaveProperty("arrivalDate");
    expect(shared).not.toHaveProperty("flightDate");
  });

  it("omits optional keys that are absent", () => {
    const minimal: Profile = {
      version: 1,
      stage: "preparing",
      basis: "spouse",
      family: "single",
      pet: true,
    };
    const shared = toSharedAnswers(minimal);
    expect(shared).toEqual({ stage: "preparing", basis: "spouse", family: "single", pet: true });
  });

  it("stays assignable to the engine's PlanAnswers", () => {
    const answers = toPlanAnswers(toSharedAnswers(fullProfile));
    expect(answers.stage).toBe("just_landed");
    expect(answers).not.toHaveProperty("city");
  });
});

describe("sharedAnswersSchema", () => {
  it("rejects unknown keys like city or dates (strict)", () => {
    const withCity = { ...toSharedAnswers(fullProfile), city: "Хайфа" };
    expect(sharedAnswersSchema.safeParse(withCity).success).toBe(false);
  });

  it("accepts a clean snapshot", () => {
    expect(sharedAnswersSchema.safeParse(toSharedAnswers(fullProfile)).success).toBe(true);
  });
});

describe("sharedDoneSchema", () => {
  it("accepts an array of slugs", () => {
    expect(sharedDoneSchema.safeParse(["open-account", "kupat-holim"]).success).toBe(true);
  });

  it("rejects more than 500 entries", () => {
    const many = Array.from({ length: 501 }, (_, i) => `step-${i}`);
    expect(sharedDoneSchema.safeParse(many).success).toBe(false);
  });
});
