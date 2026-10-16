import { afterEach, describe, expect, it } from "vitest";
import { LOCALE_COOKIE, preferenceRedirect, prefixLocale, rememberLocale } from "./preference";

describe("prefixLocale", () => {
  it("reads an explicit locale prefix", () => {
    expect(prefixLocale("/en")).toBe("en");
    expect(prefixLocale("/en/plan")).toBe("en");
    expect(prefixLocale("/ru/plan")).toBe("ru");
  });

  it("ignores unprefixed paths and look-alikes", () => {
    expect(prefixLocale("/")).toBeUndefined();
    expect(prefixLocale("/plan")).toBeUndefined();
    expect(prefixLocale("/english")).toBeUndefined();
  });
});

describe("preferenceRedirect", () => {
  it("sends unprefixed paths to the preferred non-default locale", () => {
    expect(preferenceRedirect("/", "en")).toBe("/en");
    expect(preferenceRedirect("/guides/healthcare", "en")).toBe("/en/guides/healthcare");
  });

  it("does nothing without a usable non-default preference", () => {
    expect(preferenceRedirect("/plan", undefined)).toBeNull();
    expect(preferenceRedirect("/plan", "ru")).toBeNull();
    expect(preferenceRedirect("/plan", "de")).toBeNull();
  });

  it("never overrides a path that already names its locale", () => {
    expect(preferenceRedirect("/en/plan", "en")).toBeNull();
    expect(preferenceRedirect("/ru/plan", "en")).toBeNull();
  });
});

describe("rememberLocale", () => {
  afterEach(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: test cleanup of the same cookie.
    document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
  });

  it("stores the choice in the preference cookie", () => {
    rememberLocale("en");
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=en`);
  });
});
