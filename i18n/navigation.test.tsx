import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { localizeHref, usePathname } from "./navigation";

const nextPathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nextPathname.value }));

describe("localizeHref", () => {
  it("prefixes app paths for a non-default locale only", () => {
    expect(localizeHref("/plan", "ru")).toBe("/plan");
    expect(localizeHref("/plan", "en")).toBe("/en/plan");
    expect(localizeHref("/", "en")).toBe("/en");
    expect(localizeHref("/search?q=bank", "en")).toBe("/en/search?q=bank");
  });

  it("targets the locale explicitly when switching (even the default one)", () => {
    expect(localizeHref("/plan", "ru", true)).toBe("/ru/plan");
    expect(localizeHref("/", "ru", true)).toBe("/ru");
    expect(localizeHref("/plan", "en", true)).toBe("/en/plan");
  });

  it("leaves external, protocol-relative and fragment hrefs alone", () => {
    expect(localizeHref("https://t.me/x", "en")).toBe("https://t.me/x");
    expect(localizeHref("//cdn.example.com/a", "en")).toBe("//cdn.example.com/a");
    expect(localizeHref("#top", "en")).toBe("#top");
  });
});

describe("usePathname", () => {
  it.each([
    ["/en/plan", "/plan"],
    ["/en", "/"],
    ["/plan", "/plan"],
    ["/", "/"],
    ["/english", "/english"],
  ])("%s → %s", (raw, expected) => {
    nextPathname.value = raw;
    const { result } = renderHook(() => usePathname());
    expect(result.current).toBe(expected);
  });
});
