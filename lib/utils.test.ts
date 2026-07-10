import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("resolves conflicting Tailwind classes in favour of the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("flex-col", "flex-row")).toBe("flex-row");
  });
});
