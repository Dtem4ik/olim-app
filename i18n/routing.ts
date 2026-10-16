import { defineRouting } from "next-intl/routing";

/**
 * Locale routing. Russian is the primary audience and keeps the unprefixed URLs
 * (`/plan`, `/guides/...`) so every existing link and indexed page stays valid;
 * English lives under `/en/...` (`localePrefix: "as-needed"`).
 *
 * next-intl's own detection is OFF (no `Accept-Language`, no cookie):
 *  - many Russian-speaking olim run English-language phones, so the browser
 *    language would wrongly push them to English;
 *  - next-intl's cookie is (re)written on EVERY prefixed request — including the
 *    service worker precaching `/en/...` in the background, which flipped every
 *    Russian user to English. The preference cookie is instead written only on
 *    an explicit choice and honored by `proxy.ts` (see `i18n/preference.ts`).
 */
export const routing = defineRouting({
  locales: ["ru", "en"],
  defaultLocale: "ru",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  // hreflang is emitted per page in metadata (lib/seo/i18n.ts), where we know
  // which routes actually have English content — not blanket Link headers.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
export const locales = routing.locales;
export const defaultLocale = routing.defaultLocale;
