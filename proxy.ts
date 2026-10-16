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
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const target = preferenceRedirect(pathname, request.cookies.get(LOCALE_COOKIE)?.value);
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = search;
    return NextResponse.redirect(url);
  }

  const response = intl(request);
  if (prefixLocale(pathname) === defaultLocale) {
    response.cookies.set(LOCALE_COOKIE, defaultLocale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  // Everything except API/auth handlers, Next internals, and files with an
  // extension (sw.js, icons, sitemap.xml, robots.txt, llms.txt, manifest…).
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
