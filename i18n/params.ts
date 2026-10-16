import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { type Locale, routing } from "./routing";

/**
 * Read the `[locale]` route param in a page / metadata / OG-image function and
 * register it for static rendering. The layout already 404s unknown locales, so
 * the default-locale fallback here only satisfies the type.
 */
export async function pageLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  const resolved = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  setRequestLocale(resolved);
  return resolved;
}

/** Props of any page / metadata function under `app/[locale]`. */
export type LocaleParams = { params: Promise<{ locale: string }> };
