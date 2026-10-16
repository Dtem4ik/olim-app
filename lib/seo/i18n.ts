import type { Metadata } from "next";
import { defaultLocale, type Locale, locales } from "@/i18n/routing";

/** OpenGraph `og:locale` value per app locale. */
const OG_LOCALES: Record<Locale, string> = { ru: "ru_RU", en: "en_US" };

export function ogLocale(locale: Locale): string {
  return OG_LOCALES[locale];
}

/** Narrow an arbitrary string (a route param) to a supported locale. */
export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

/**
 * Public path of an unprefixed route in a locale, mirroring the router's
 * `localePrefix: "as-needed"`: the default locale stays unprefixed, others get
 * `/{locale}` (and the home `/` becomes `/en`, not `/en/`).
 */
export function localePath(locale: Locale, path: string): string {
  if (locale === defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * `alternates` for a route.
 *
 * - `translated` routes (UI-only pages: home, plan, onboarding, about) are fully
 *   localized, so each locale is self-canonical and they cross-reference each
 *   other via hreflang (+ `x-default` → Russian).
 * - Content routes (guides) still carry Russian-only text, so the English URL
 *   would be a near-duplicate: it canonicalizes to the Russian page and emits no
 *   hreflang until the content itself is translated.
 */
export function localeAlternates(
  locale: Locale,
  path: string,
  { translated }: { translated: boolean },
): NonNullable<Metadata["alternates"]> {
  if (!translated) return { canonical: path };
  const languages: Record<string, string> = { "x-default": path };
  for (const l of locales) languages[l] = localePath(l, path);
  return { canonical: localePath(locale, path), languages };
}
