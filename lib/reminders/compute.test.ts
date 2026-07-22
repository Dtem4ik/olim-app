import { describe, expect, it } from "vitest";
import { computeDueReminders, type ReminderStep } from "./compute";

const steps: ReminderStep[] = [
  {
    slug: "swap-license",
    title: "Обменять права",
    sectionSlug: "transport",
    warnRule: { type: "expires_days", days: 30 },
  },
  {
    slug: "register-kupat",
    title: "Записаться в больничную кассу",
    sectionSlug: "healthcare",
    warnRule: { type: "deadline_after_arrival_days", days: 90 },
  },
  {
    slug: "pre-flight-doc",
    title: "Подготовить документы",
    sectionSlug: "prep",
    warnRule: { type: "deadline_before_flight_days", days: 14 },
  },
];

// arrival 2026-07-01 → swap-license due 2026-07-31, kupat due 2026-09-29.
const arrival = { arrivalDate: "2026-07-01" };

describe("computeDueReminders", () => {
  it("fires for a step whose deadline is within the lead window", () => {
    const now = new Date(2026, 6, 20); // 2026-07-20, 11 days before 07-31
    const due = computeDueReminders(
      { answers: arrival, doneStepIds: [], leadDays: 14 },
      steps,
      now,
      new Set(),
    );
    expect(due.map((d) => d.stepSlug)).toEqual(["swap-license"]);
    expect(due[0]?.daysUntil).toBe(11);
  });

  it("does not fire outside the lead window", () => {
    const now = new Date(2026, 6, 1); // 30 days before 07-31, lead 14
    const due = computeDueReminders(
      { answers: arrival, doneStepIds: [], leadDays: 14 },
      steps,
      now,
      new Set(),
    );
    expect(due).toEqual([]);
  });

  it("a larger lead window catches both upcoming deadlines", () => {
    const now = new Date(2026, 6, 20);
    const due = computeDueReminders(
      { answers: arrival, doneStepIds: [], leadDays: 90 },
      steps,
      now,
      new Set(),
    );
    expect(due.map((d) => d.stepSlug).sort()).toEqual(["register-kupat", "swap-license"]);
  });

  it("skips done steps and already-sent steps", () => {
    const now = new Date(2026, 6, 20);
    expect(
      computeDueReminders(
        { answers: arrival, doneStepIds: ["swap-license"], leadDays: 14 },
        steps,
        now,
        new Set(),
      ),
    ).toEqual([]);
    expect(
      computeDueReminders(
        { answers: arrival, doneStepIds: [], leadDays: 14 },
        steps,
        now,
        new Set(["swap-license"]),
      ),
    ).toEqual([]);
  });

  it("does not fire for overdue deadlines", () => {
    const now = new Date(2026, 7, 5); // past 07-31
    const due = computeDueReminders(
      { answers: arrival, doneStepIds: [], leadDays: 30 },
      steps,
      now,
      new Set(),
    );
    expect(due.map((d) => d.stepSlug)).not.toContain("swap-license");
  });

  it("skips steps whose anchor date is unknown", () => {
    const now = new Date(2026, 6, 20);
    // No flightDate → pre-flight-doc can't compute a due date.
    const due = computeDueReminders(
      { answers: {}, doneStepIds: [], leadDays: 90 },
      steps,
      now,
      new Set(),
    );
    expect(due).toEqual([]);
  });
});
