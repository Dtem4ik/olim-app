import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath (open-redirect guard on the auth callback)", () => {
  it("keeps a same-origin absolute path", () => {
    expect(safeNextPath("/plan")).toBe("/plan");
    expect(safeNextPath("/guides/banks-and-money")).toBe("/guides/banks-and-money");
  });

  it("falls back to /profile for a missing value", () => {
    expect(safeNextPath(null)).toBe("/profile");
    expect(safeNextPath(undefined)).toBe("/profile");
    expect(safeNextPath("")).toBe("/profile");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.com")).toBe("/profile");
    expect(safeNextPath("//evil.com")).toBe("/profile");
    expect(safeNextPath("/\\evil.com")).toBe("/profile");
    expect(safeNextPath("javascript:alert(1)")).toBe("/profile");
  });

  it("honors a custom fallback", () => {
    expect(safeNextPath(null, "/")).toBe("/");
  });
});
