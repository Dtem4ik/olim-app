"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { rememberLocale } from "@/i18n/preference";
import { type Locale, locales } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * RU / EN segmented switch. Each option is a real locale-aware `<Link>` to the
 * same page in the other language (works without JS), and clicking it saves the
 * choice in the preference cookie so it sticks (`/` → `/en` next time).
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("profile.languages");
  const current = useLocale() as Locale;
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className={cn("flex rounded-full border bg-muted p-1", className)}>
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            hrefLang={locale}
            lang={locale}
            aria-current={active ? "true" : undefined}
            data-testid={`language-${locale}`}
            onClick={() => rememberLocale(locale)}
            className={cn(
              "flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors",
              active
                ? "bg-surface text-surface-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(locale)}
          </Link>
        );
      })}
    </nav>
  );
}
