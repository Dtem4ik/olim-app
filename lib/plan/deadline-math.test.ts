import { describe, expect, it } from "vitest";
import { addDays, computeDueISO, daysUntil, parseISODate, toISODate } from "./deadline-math";

describe("computeDueISO", () => {
  it("deadline_before_flight_days → flight − days", () => {
    expect(
      computeDueISO(
        { type: "deadline_before_flight_days", days: 10 },
        { flightDate: "2026-08-01" },
      ),
    ).toBe("2026-07-22");
  });
  it("deadline_after_arrival_days → arrival + days", () => {
    expect(
      computeDueISO(
        { type: "deadline_after_arrival_days", days: 90 },
        { arrivalDate: "2026-07-01" },
      ),
    ).toBe("2026-09-29");
  });
  it("expires_days also anchors on arrival", () => {
    expect(computeDueISO({ type: "expires_days", days: 30 }, { arrivalDate: "2026-07-01" })).toBe(
      "2026-07-31",
    );
  });
  it("returns null when the required anchor is missing", () => {
    expect(computeDueISO({ type: "deadline_before_flight_days", days: 10 }, {})).toBeNull();
    expect(
      computeDueISO({ type: "expires_days", days: 10 }, { flightDate: "2026-08-01" }),
    ).toBeNull();
  });
});

describe("daysUntil", () => {
  const now = new Date(2026, 6, 20); // 2026-07-20 local
  it("counts whole calendar days ahead", () => {
    expect(daysUntil("2026-07-27", now)).toBe(7);
    expect(daysUntil("2026-07-20", now)).toBe(0);
  });
  it("is negative when overdue", () => {
    expect(daysUntil("2026-07-13", now)).toBe(-7);
  });
  it("ignores the time-of-day of now", () => {
    expect(daysUntil("2026-07-21", new Date(2026, 6, 20, 23, 59))).toBe(1);
  });
});

describe("date helpers", () => {
  it("round-trips ISO", () => {
    expect(toISODate(parseISODate("2026-02-28"))).toBe("2026-02-28");
  });
  it("addDays crosses month boundaries", () => {
    expect(toISODate(addDays(parseISODate("2026-01-31"), 1))).toBe("2026-02-01");
  });
});
