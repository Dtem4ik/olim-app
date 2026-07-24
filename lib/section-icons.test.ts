import { BookOpen, Landmark, PawPrint, ShieldAlert } from "lucide-react";
import { describe, expect, it } from "vitest";
import { sectionIcon } from "./section-icons";

describe("sectionIcon", () => {
  it("maps known names and falls back to BookOpen", () => {
    expect(sectionIcon("landmark")).toBe(Landmark);
    expect(sectionIcon("unknown")).toBe(BookOpen);
    expect(sectionIcon(null)).toBe(BookOpen);
  });

  it("maps the new section icons", () => {
    expect(sectionIcon("paw-print")).toBe(PawPrint);
    expect(sectionIcon("shield-alert")).toBe(ShieldAlert);
  });
});
