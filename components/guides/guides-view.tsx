"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { SectionTile } from "@/components/section-tile";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ContentSection, ContentStep } from "@/lib/content/repo";
import { matchesCond, type PlanAnswers } from "@/lib/plan/build-plan";
import { loadProfile, type Profile } from "@/lib/plan/profile";
import { sectionIcon } from "@/lib/section-icons";

export function GuidesView({
  sections,
  steps,
}: {
  sections: ContentSection[];
  steps: ContentStep[];
}) {
  const t = useTranslations("guides");
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => setProfile(loadProfile()), []);

  const countFor = useMemo(() => {
    const visible = profile
      ? steps.filter((s) => matchesCond(s.cond, profile as PlanAnswers))
      : steps;
    return (slug: string) => visible.filter((s) => s.section_slug === slug).length;
  }, [steps, profile]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-24">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">{t("title")}</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          {profile ? t("personalizedHint") : t("allHint")}
        </p>
        <div className="grid grid-cols-2 gap-3" data-testid="sections-grid">
          {sections.map((s) => (
            <SectionTile
              key={s.slug}
              title={s.title}
              description={s.description ?? undefined}
              icon={sectionIcon(s.icon)}
              href={`/guides/${s.slug}`}
              count={countFor(s.slug)}
            />
          ))}
        </div>
      </main>

      <SiteBottomNav activeHref="/guides" />
    </div>
  );
}
