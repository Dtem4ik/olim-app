import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export type { Locale } from "./routing";
export { defaultLocale, locales } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` comes from the `[locale]` segment; routes outside it
  // (manifest, API, sitemap) fall back to the default locale.
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
