"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { StepItem, type StepItemData } from "@/components/guides/step-item";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { capture } from "@/lib/analytics";
import type { ContentSection, ContentStep } from "@/lib/content/repo";
import { computeWarning, matchesCond, type PlanAnswers } from "@/lib/plan/build-plan";
import { loadProfile, type Profile } from "@/lib/plan/profile";

export type SectionStep = ContentStep & { bodyHtml: string };

export function SectionView({ section, steps }: { section: ContentSection; steps: SectionStep[] }) {
  const t = useTranslations("guides");
  const tOnb = useTranslations("onboarding");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => setProfile(loadProfile()), []);
  useEffect(() => capture("section_opened", { section: section.slug }), [section.slug]);

  const items: StepItemData[] = useMemo(() => {
    const visible = profile
      ? steps.filter((s) => matchesCond(s.cond, profile as PlanAnswers))
      : steps;
    const sorted = [...visible].sort(
      (a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug),
    );
    const now = new Date();
    return sorted.map((s) => ({
      id: s.id,
      slug: s.slug,
      sectionSlug: section.slug,
      title: s.title,
      summary: s.summary,
      bodyHtml: s.bodyHtml,
      docs: s.docs,
      tips: s.tips,
      stageLabel: s.stage ? tOnb(`stages.${s.stage}`) : null,
      sourceUrl: s.source_url,
      lastVerifiedAt: s.last_verified_at,
      warningDue:
        s.warn_rule && profile
          ? computeWarning(s.warn_rule, profile as PlanAnswers, now).due
          : null,
    }));
  }, [steps, profile, section.slug, tOnb]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-24">
      <header className="flex items-center justify-between px-4 pt-6">
        <Link href="/guides" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 py-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-balance">{section.title}</h1>
          {section.description && <p className="text-muted-foreground">{section.description}</p>}
          <p className="text-xs text-muted-foreground">
            {profile ? t("personalizedHint") : t("allHint")}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="flex flex-col gap-3" data-testid="section-steps">
            {items.map((item) => (
              <StepItem key={item.slug} step={item} />
            ))}
          </div>
        )}
      </main>

      <SiteBottomNav activeHref="/guides" />
    </div>
  );
}
