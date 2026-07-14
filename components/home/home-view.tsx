"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { DeadlineBadge } from "@/components/deadline-badge";
import { SectionTile } from "@/components/section-tile";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { StepCard } from "@/components/step-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import type { ContentSection, ContentStep } from "@/lib/content/repo";
import { buildPlan, type PlanEntry } from "@/lib/plan/build-plan";
import { loadProfile, type Profile } from "@/lib/plan/profile";
import { useProgress } from "@/lib/plan/use-progress";
import { sectionIcon } from "@/lib/section-icons";
import { cn } from "@/lib/utils";

const BURNING_KINDS = new Set(["overdue", "today", "soon"]);

export function HomeView({
  sections,
  steps,
}: {
  sections: ContentSection[];
  steps: ContentStep[];
}) {
  const t = useTranslations("home");
  const tOnb = useTranslations("onboarding");
  const { isDone } = useProgress();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => setProfile(loadProfile()), []);

  const plan = useMemo(() => (profile ? buildPlan(profile, steps) : null), [profile, steps]);

  const burning: PlanEntry<ContentStep>[] = useMemo(() => {
    if (!plan) return [];
    return plan.entries
      .filter((e) => e.warning?.status && BURNING_KINDS.has(e.warning.status.kind))
      .sort((a, b) => (a.warning?.status?.days ?? 0) - (b.warning?.status?.days ?? 0));
  }, [plan]);

  const next = useMemo(
    () => plan?.entries.filter((e) => !isDone(e.step.slug)).slice(0, 3) ?? [],
    [plan, isDone],
  );

  const countFor = (slug: string) =>
    plan
      ? plan.entries.filter((e) => e.step.section_slug === slug).length
      : steps.filter((s) => s.section_slug === slug).length;

  const stageLabel = (s: Profile["stage"]) => tOnb(`stages.${s}`);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-24">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">Olim</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-8 px-4 py-6">
        {profile ? (
          <>
            <section className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-balance">
                {t(`greeting.${profile.stage}`)}
              </h1>
              <p className="text-sm text-muted-foreground">
                {[
                  profile.monthsInCountry !== undefined
                    ? t("context.months", { months: profile.monthsInCountry })
                    : null,
                  profile.city ? t("context.city", { city: profile.city }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </section>

            <section aria-labelledby="burning-h" className="flex flex-col gap-3">
              <h2
                id="burning-h"
                className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
              >
                {t("burning.title")}
              </h2>
              {burning.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("burning.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-2" data-testid="burning-list">
                  {burning.map((e) => (
                    <li
                      key={e.step.slug}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                    >
                      <Link
                        href={`/guides/${e.step.section_slug}#${e.step.slug}`}
                        className="text-sm font-medium"
                      >
                        {e.step.title}
                      </Link>
                      {e.warning?.due && <DeadlineBadge due={new Date(e.warning.due)} />}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="next-h" className="flex flex-col gap-3">
              <h2
                id="next-h"
                className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
              >
                {t("next.title")}
              </h2>
              {next.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("next.allDone")}</p>
              ) : (
                <ul className="flex flex-col gap-3" data-testid="next-list">
                  {next.map((e) => (
                    <li key={e.step.slug}>
                      <StepCard
                        title={e.step.title}
                        summary={e.step.summary ?? undefined}
                        stage={e.step.stage ? stageLabel(e.step.stage) : undefined}
                        href={`/guides/${e.step.section_slug}#${e.step.slug}`}
                        deadline={
                          e.warning?.due ? (
                            <DeadlineBadge due={new Date(e.warning.due)} />
                          ) : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <section className="flex flex-col gap-4 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-balance">{t("invite.title")}</h1>
            <p className="text-muted-foreground">{t("invite.subtitle")}</p>
            <Link
              href="/onboarding"
              className={buttonVariants({ size: "lg", className: "w-full" })}
              data-testid="home-invite-cta"
            >
              {t("invite.cta")}
            </Link>
          </section>
        )}

        <section aria-labelledby="sections-h" className="flex flex-col gap-3">
          <h2
            id="sections-h"
            className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
          >
            {t("sections.title")}
          </h2>
          <div className="grid grid-cols-2 gap-3" data-testid="sections-grid">
            {sections.map((s) => {
              const count = countFor(s.slug);
              return (
                <SectionTile
                  key={s.slug}
                  title={s.title}
                  description={s.description ?? undefined}
                  icon={sectionIcon(s.icon)}
                  href={`/guides/${s.slug}`}
                  count={count}
                  dimmed={profile != null && count === 0}
                />
              );
            })}
          </div>
        </section>

        {profile && (
          <Link
            href="/onboarding"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}
            data-testid="home-edit"
          >
            {t("edit")}
          </Link>
        )}
      </main>

      <SiteBottomNav activeHref="/" />
    </div>
  );
}
