"use client";

import { Globe, Languages, Palette, User } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { SearchButton } from "@/components/search-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearProfile, loadProfile, type Profile } from "@/lib/plan/profile";
import { PROGRESS_STORAGE_KEY } from "@/lib/plan/progress";

export function ProfileView() {
  const t = useTranslations("profile");
  const tOnb = useTranslations("onboarding");
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const loaded = profile !== undefined;
  useEffect(() => setProfile(loadProfile()), []);

  const rows = profile
    ? [
        tOnb(`questions.basis.options.${profile.basis}`),
        profile.country ? tOnb(`questions.country.options.${profile.country}`) : null,
        tOnb(`questions.family.options.${profile.family}`),
        profile.city,
      ].filter(Boolean)
    : [];

  const subtitle = profile
    ? [profile.country ? tOnb(`questions.country.options.${profile.country}`) : null, profile.city]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col pb-28">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">{t("title")}</span>
        <SearchButton />
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-4">
        {!loaded ? (
          <div className="flex flex-col gap-3" aria-hidden>
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : profile ? (
          <>
            <section className="flex items-center gap-4 rounded-3xl bg-sec-lavender p-5 text-foreground">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface/70">
                <User className="size-8" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-col">
                <h2 className="truncate text-xl font-bold tracking-tight">
                  {tOnb(`stages.${profile.stage}`)}
                </h2>
                {subtitle && <p className="truncate text-sm text-foreground/70">{subtitle}</p>}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="px-1 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("situation")}
              </h2>
              <ul
                className="flex flex-col divide-y divide-border rounded-2xl border border-border"
                data-testid="profile-summary"
              >
                {rows.map((r) => (
                  <li key={r} className="px-4 py-3 text-sm">
                    {r}
                  </li>
                ))}
              </ul>
              <Link
                href="/onboarding"
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                {t("edit")}
              </Link>
            </section>
          </>
        ) : (
          <p className="rounded-2xl border border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        )}

        <section className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          <SettingRow icon={Palette} label={t("theme")}>
            <ThemeToggle />
          </SettingRow>
          <SettingRow icon={Languages} label={t("language")}>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe className="size-4" aria-hidden />
              RU · {t("languageSoon")}
            </span>
          </SettingRow>
        </section>

        {profile && (
          <Button
            variant="ghost"
            className="self-start text-destructive"
            data-testid="profile-startover"
            onClick={() => {
              clearProfile();
              if (typeof window !== "undefined")
                window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
              setProfile(null);
            }}
          >
            {t("startOver")}
          </Button>
        )}
      </main>
    </div>
  );
}

/** A settings row: leading icon + label on the left, control on the right. */
function SettingRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Palette;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="flex items-center gap-3 text-sm">
        <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        {label}
      </span>
      {children}
    </div>
  );
}
