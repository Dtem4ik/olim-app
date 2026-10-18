"use client";

import NextLink from "next/link";
import { usePathname as useNextPathname } from "next/navigation";
import { useLocale } from "next-intl";
import type { ComponentProps } from "react";
import { localePath } from "@/lib/seo/i18n";
import { prefixLocale } from "./preference";
import type { Locale } from "./routing";

/**
 * Locale-aware `next/link`: an app path (`/plan`) gets the current locale's
 * prefix (`/en/plan` in English). Deliberately a thin wrapper instead of
 * next-intl's `createNavigation` — that ships its whole client router layer
 * (~10 KB gz on every route) for what is a string prefix here.
 *
 * `locale` switches language: the link targets that locale explicitly, even the
 * default one (`/ru/plan`), so the proxy records the choice and strips the
 * prefix — the switch works without JS too.
 */
export function Link({
  href,
  locale,
  ...rest
}: Omit<ComponentProps<typeof NextLink>, "href"> & { href: string; locale?: Locale }) {
  const current = useLocale() as Locale;
  return <NextLink href={localizeHref(href, locale ?? current, locale !== undefined)} {...rest} />;
}

/** Prefix an in-app path for a locale; external/relative hrefs pass through. */
export function localizeHref(href: string, locale: Locale, explicit = false): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (!explicit) return localePath(locale, href);
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** The current path WITHOUT its locale prefix (`/en/plan` → `/plan`). */
export function usePathname(): string {
  const pathname = useNextPathname() ?? "/";
  const locale = prefixLocale(pathname);
  if (!locale) return pathname;
  return pathname.slice(locale.length + 1) || "/";
}
