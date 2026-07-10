import { describe, expect, it } from "vitest";
import { getDeadlineStatus } from "./deadline";

const now = new Date("2026-07-10T09:00:00");

describe("getDeadlineStatus", () => {
  it("classifies a past date as overdue with negative days", () => {
    expect(getDeadlineStatus(new Date("2026-07-08T00:00:00"), now)).toEqual({
      kind: "overdue",
      days: -2,
    });
  });

  it("classifies the same calendar day as today regardless of time", () => {
    expect(getDeadlineStatus(new Date("2026-07-10T23:59:00"), now)).toEqual({
      kind: "today",
      days: 0,
    });
  });

  it("classifies a date within the soon window as soon", () => {
    expect(getDeadlineStatus(new Date("2026-07-14T00:00:00"), now)).toEqual({
      kind: "soon",
      days: 4,
    });
  });

  it("treats the soon-window boundary as soon and the next day as later", () => {
    expect(getDeadlineStatus(new Date("2026-07-17T00:00:00"), now).kind).toBe("soon");
    expect(getDeadlineStatus(new Date("2026-07-18T00:00:00"), now).kind).toBe("later");
  });

  it("respects a custom soon window", () => {
    expect(getDeadlineStatus(new Date("2026-07-13T00:00:00"), now, 2).kind).toBe("later");
    expect(getDeadlineStatus(new Date("2026-07-12T00:00:00"), now, 2).kind).toBe("soon");
  });

  it("defaults `now` to the current date", () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    expect(getDeadlineStatus(future).kind).toBe("later");
  });
});
