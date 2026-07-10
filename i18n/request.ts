import { getRequestConfig } from "next-intl/server";

/**
 * Single-locale setup for Phase 1: Russian ships now, English keys stay ready.
 * When locale routing lands, derive `locale` from the request instead.
 */
export const defaultLocale = "ru" as const;
export const locales = ["ru", "en"] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const locale: Locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
