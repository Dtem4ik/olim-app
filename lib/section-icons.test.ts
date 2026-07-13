import { BookOpen, Landmark } from "lucide-react";
import { describe, expect, it } from "vitest";
import { sectionIcon } from "./section-icons";

describe("sectionIcon", () => {
  it("maps known names and falls back to BookOpen", () => {
    expect(sectionIcon("landmark")).toBe(Landmark);
    expect(sectionIcon("unknown")).toBe(BookOpen);
    expect(sectionIcon(null)).toBe(BookOpen);
  });
});
