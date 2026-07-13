"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { clearProfile, loadProfile, type Profile } from "@/lib/plan/profile";
import { PROGRESS_STORAGE_KEY } from "@/lib/plan/progress";

export function ProfileView() {
  const t = useTranslations("profile");
  const tOnb = useTranslations("onboarding");
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => setProfile(loadProfile()), []);

  const rows = profile
    ? [
        tOnb(`stages.${profile.stage}`),
        tOnb(`questions.basis.options.${profile.basis}`),
        profile.country ? tOnb(`questions.country.options.${profile.country}`) : null,
        tOnb(`questions.family.options.${profile.family}`),
        profile.city,
      ].filter(Boolean)
    : [];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-24">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">{t("title")}</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-4">
        {profile ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("situation")}
            </h2>
            <ul className="flex flex-col gap-1 text-sm" data-testid="profile-summary">
              {rows.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              {t("edit")}
            </Link>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        )}

        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t("theme")}</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t("language")}</span>
            <span className="text-sm text-muted-foreground">RU · {t("languageSoon")}</span>
          </div>
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

      <SiteBottomNav activeHref="/profile" />
    </div>
  );
}
