"use client";

import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { DeadlineBadge } from "@/components/deadline-badge";
import { SearchButton } from "@/components/search-button";
import { SectionTile } from "@/components/section-tile";
import { StepCard } from "@/components/step-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentSection, ContentStep } from "@/lib/content/repo";
import { buildPlan, type PlanEntry } from "@/lib/plan/build-plan";
import { loadProfile, type Profile } from "@/lib/plan/profile";
import { useProgress } from "@/lib/plan/use-progress";
import { sectionColor } from "@/lib/section-colors";
import { sectionIcon } from "@/lib/section-icons";

const BURNING_KINDS = new Set(["overdue", "today", "soon"]);

/** Tel Aviv seafront — the emotional "you're in Israel" hero (Unsplash CDN). */
const HERO_SRC = "/img/hero-telaviv.webp";

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
  // `undefined` = still reading localStorage (SSR + first paint). Distinguishing
  // it from `null` (loaded, no profile) avoids flashing the invite/all-sections
  // state before the saved profile resolves on the client.
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const loaded = profile !== undefined;

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

  const contextLine = profile
    ? [
        profile.monthsInCountry !== undefined
          ? t("context.months", { months: profile.monthsInCountry })
          : null,
        profile.city ? t("context.city", { city: profile.city }) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col pb-28">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">Olim</span>
        <SearchButton />
      </header>

      <main className="flex flex-1 flex-col gap-8 px-4 py-6">
        <HeroBanner
          title={profile ? t(`greeting.${profile.stage}`) : t("invite.title")}
          subtitle={profile ? contextLine : t("invite.subtitle")}
          loading={!loaded}
        />

        {!loaded ? (
          <div className="flex flex-col gap-3" aria-hidden data-testid="home-loading">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : profile ? (
          <>
            <section aria-labelledby="burning-h" className="flex flex-col gap-3">
              <h2
                id="burning-h"
                className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
              >
                {t("burning.title")}
              </h2>
              {burning.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                  {t("burning.empty")}
                </div>
              ) : (
                <ul className="flex flex-col gap-2" data-testid="burning-list">
                  {burning.map((e) => (
                    <li
                      key={e.step.slug}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                    >
                      <Link
                        href={`/guides/${e.step.section_slug}/${e.step.slug}`}
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
                        href={`/guides/${e.step.section_slug}/${e.step.slug}`}
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
          <Link
            href="/onboarding"
            className={buttonVariants({ size: "lg", className: "w-full" })}
            data-testid="home-invite-cta"
          >
            {t("invite.cta")}
          </Link>
        )}

        <section aria-labelledby="sections-h" className="flex flex-col gap-3">
          <h2
            id="sections-h"
            className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
          >
            {profile ? t("sections.yours") : t("sections.title")}
          </h2>
          <div className="grid grid-cols-2 gap-3" data-testid="sections-grid">
            {!loaded
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="min-h-40 rounded-3xl" />)
              : sections
                  .map((s) => ({ s, count: countFor(s.slug) }))
                  // Home is the personalized screen — only surface sections that have
                  // steps for this reader. The full catalogue lives under Guides.
                  .filter(({ count }) => count > 0)
                  .map(({ s, count }) => (
                    <SectionTile
                      key={s.slug}
                      title={s.title}
                      description={s.description ?? undefined}
                      icon={sectionIcon(s.icon)}
                      href={`/guides/${s.slug}`}
                      count={count}
                      color={sectionColor(s.slug)}
                      imageUrl={s.image_url ?? undefined}
                    />
                  ))}
          </div>
        </section>
      </main>
    </div>
  );
}

/** Full-bleed photo hero with the greeting overlaid — the emotional anchor. */
function HeroBanner({
  title,
  subtitle,
  loading,
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl">
      <Image
        src={HERO_SRC}
        alt=""
        width={896}
        height={480}
        priority
        sizes="(max-width: 448px) 100vw, 448px"
        className="h-44 w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-5">
        {loading ? (
          <>
            <div className="h-6 w-2/3 rounded-md bg-white/25" />
            <div className="h-4 w-1/3 rounded-md bg-white/20" />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-white text-balance">{title}</h1>
            {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
          </>
        )}
      </div>
    </section>
  );
}
