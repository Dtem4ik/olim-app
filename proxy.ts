import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  preferenceRedirect,
  prefixLocale,
} from "./i18n/preference";
import { defaultLocale, routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/**
 * Locale routing. Unprefixed paths render Russian; `/en/...` renders English.
 *
 * The UI language changes only on an explicit choice (`i18n/preference.ts`):
 *  - the `NEXT_LOCALE` cookie (written by the language switcher) sends an
 *    unprefixed visit to its locale: `/plan` → `/en/plan`;
 *  - an explicit `/ru/...` link means "Russian, please": next-intl strips the
 *    prefix (→ `/plan`) and we record the choice, so no-JS switching works too.
 * Plain requests never write the cookie — the service worker precaching
 * `/en/...` in the background must not change anyone's language.
 *
 * Both rules apply to page navigations only (`isBackgroundFetch`): Next's Link
 * prefetch of the switcher's `/ru/...` link would otherwise reset an English
 * reader to Russian just by opening Profile, and the SW precaching `/plan` with
 * `NEXT_LOCALE=en` would store the English page under the Russian URL.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // OG images live under `[locale]`, so Next emits Russian og:image URLs as
  // `/ru/.../opengraph-image`. Serve them as-is: next-intl would 307 them to the
  // unprefixed URL, and some link-preview scrapers don't follow redirects. The
  // unprefixed form (old, already-cached URLs) still works via the rewrite below.
  if (isMetadataImage(pathname)) {
    return prefixLocale(pathname) ? NextResponse.next() : intl(request);
  }

  const background = isBackgroundFetch(request);

  const target = background
    ? null
    : preferenceRedirect(pathname, request.cookies.get(LOCALE_COOKIE)?.value);
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = search;
    return NextResponse.redirect(url);
  }

  const response = intl(request);
  if (!background && prefixLocale(pathname) === defaultLocale) {
    response.cookies.set(LOCALE_COOKIE, defaultLocale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }
  return response;
}

/**
 * A fetch() rather than a page navigation: RSC prefetches/navigations and SW
 * precache requests. The SW forwards real navigations as-is, so they keep
 * `Sec-Fetch-Dest: document`. Browsers without Fetch Metadata send no header
 * and are treated as navigations (the pre-fix behavior).
 */
export function isBackgroundFetch(request: NextRequest): boolean {
  if (request.headers.has("rsc") || request.headers.has("next-router-prefetch")) return true;
  const dest = request.headers.get("sec-fetch-dest");
  return dest !== null && dest !== "document";
}

/** A file-convention OG image route (`.../opengraph-image`, `?hash` aside). */
export function isMetadataImage(pathname: string): boolean {
  return /(^|\/)opengraph-image(-[\w-]+)?$/.test(pathname);
}

export const config = {
  // Everything except API/auth handlers, Next internals, and files with an
  // extension (sw.js, icons, sitemap.xml, robots.txt, llms.txt, manifest…).
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
