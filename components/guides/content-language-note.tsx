"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { defaultLocale } from "@/i18n/routing";

/**
 * Guide content (sections, steps) is authored in Russian only for now. In any
 * other UI locale, say so up front instead of silently mixing languages.
 */
export function ContentLanguageNote() {
  const locale = useLocale();
  const t = useTranslations("guides");
  if (locale === defaultLocale) return null;
  return (
    <p
      className="flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-xs text-muted-foreground"
      data-testid="content-language-note"
    >
      <Languages className="size-4 shrink-0" aria-hidden />
      {t("contentLanguageNote")}
    </p>
  );
}
