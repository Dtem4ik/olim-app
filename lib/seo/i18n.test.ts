import { describe, expect, it } from "vitest";
import { isLocale, localeAlternates, localePath, ogLocale, untranslatedRouteSeo } from "./i18n";

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
    expect(localeAlternates("en", "/plan")).toEqual({
      canonical: "/en/plan",
      languages: { "x-default": "/plan", ru: "/plan", en: "/en/plan" },
    });
    expect(localeAlternates("ru", "/").canonical).toBe("/");
  });
});

describe("untranslatedRouteSeo", () => {
  it("keeps the Russian original self-canonical and indexable", () => {
    expect(untranslatedRouteSeo("ru", "/guides/banks")).toEqual({
      alternates: { canonical: "/guides/banks" },
    });
  });

  it("keeps the English shell out of the index, without a cross-language canonical", () => {
    expect(untranslatedRouteSeo("en", "/guides/banks")).toEqual({
      robots: { index: false, follow: true },
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
