import { defaultLocale, type Locale, locales } from "./routing";

/** Cookie holding the visitor's explicit UI-language choice. */
export const LOCALE_COOKIE = "NEXT_LOCALE";
/** One year — a language choice is long-lived. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function asLocale(value: string | undefined): Locale | undefined {
  return (locales as readonly string[]).includes(value ?? "") ? (value as Locale) : undefined;
}

/** The locale an explicit path prefix names (`/en/plan` → `en`, `/plan` → none). */
export function prefixLocale(pathname: string): Locale | undefined {
  return asLocale(pathname.split("/")[1]);
}

/**
 * Where an unprefixed request should go given the saved preference: `/plan`
 * with `NEXT_LOCALE=en` → `/en/plan`. Returns null when no redirect is needed
 * (no/unknown/default preference, or the path already names a locale).
 */
export function preferenceRedirect(pathname: string, cookie: string | undefined): string | null {
  const preferred = asLocale(cookie);
  if (!preferred || preferred === defaultLocale) return null;
  if (prefixLocale(pathname)) return null;
  return pathname === "/" ? `/${preferred}` : `/${preferred}${pathname}`;
}

/**
 * Browser-side: remember an explicit language choice (the switcher). Written
 * here — never by the proxy on ordinary requests — so background fetches (the
 * SW precaching `/en/...`) can't change anyone's language.
 */
export function rememberLocale(locale: Locale): void {
  // biome-ignore lint/suspicious/noDocumentCookie: a single first-party preference cookie; the Cookie Store API isn't in Safari.
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}
