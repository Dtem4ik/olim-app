"use client";

import { useLocale } from "next-intl";
import { useCallback } from "react";
import { localePath } from "@/lib/seo/i18n";
import type { Locale } from "./routing";

/**
 * Prefix an app path with the current locale (`/plan` → `/en/plan` in English).
 * For the few places that build URLs by hand instead of via `<Link>`:
 * `history.replaceState`, share URLs.
 */
export function useLocalePath(): (path: string) => string {
  const locale = useLocale() as Locale;
  return useCallback((path: string) => localePath(locale, path), [locale]);
}
