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
 * `alternates` for a fully translated route (UI-only pages: home, plan,
 * onboarding, about): each locale is self-canonical and they cross-reference
 * each other via hreflang (+ `x-default` → Russian).
 */
export function localeAlternates(
  locale: Locale,
  path: string,
): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = { "x-default": path };
  for (const l of locales) languages[l] = localePath(l, path);
  return { canonical: localePath(locale, path), languages };
}

/**
 * Index signals for a content route (guides) whose text is Russian-only for now.
 *
 * Russian: self-canonical, as before. Other locales: `noindex, follow` and no
 * canonical. The English URL is an English shell around Russian text — not a
 * translation (so no hreflang) and not a clean duplicate either; Google advises
 * against cross-language canonicals, and `noindex` keeps the hybrid out of the
 * index deterministically while its links are still followed. Switch these
 * routes to `localeAlternates` once the content itself is translated.
 */
export function untranslatedRouteSeo(
  locale: Locale,
  path: string,
): Pick<Metadata, "alternates" | "robots"> {
  if (locale === defaultLocale) return { alternates: { canonical: path } };
  return { robots: { index: false, follow: true } };
}
