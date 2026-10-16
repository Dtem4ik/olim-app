import { describe, expect, it } from "vitest";
import { isLocale, localeAlternates, localePath, ogLocale } from "./i18n";

describe("localePath", () => {
  it("keeps the default locale unprefixed", () => {
    expect(localePath("ru", "/")).toBe("/");
    expect(localePath("ru", "/plan")).toBe("/plan");
  });

  it("prefixes other locales, without a trailing slash on home", () => {
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("en", "/guides/banks/open-account")).toBe("/en/guides/banks/open-account");
  });
});

describe("localeAlternates", () => {
  it("self-canonicalizes translated routes and lists hreflang for every locale", () => {
    expect(localeAlternates("en", "/plan", { translated: true })).toEqual({
      canonical: "/en/plan",
      languages: { "x-default": "/plan", ru: "/plan", en: "/en/plan" },
    });
    expect(localeAlternates("ru", "/", { translated: true }).canonical).toBe("/");
  });

  it("points untranslated content routes at the Russian original", () => {
    expect(localeAlternates("en", "/guides/banks", { translated: false })).toEqual({
      canonical: "/guides/banks",
    });
  });
});

describe("ogLocale / isLocale", () => {
  it("maps locales to OpenGraph codes", () => {
    expect(ogLocale("ru")).toBe("ru_RU");
    expect(ogLocale("en")).toBe("en_US");
  });

  it("accepts only supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
