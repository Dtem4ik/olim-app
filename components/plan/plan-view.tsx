"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type CSSProperties, useMemo, useState } from "react";
import { DeadlineBadge } from "@/components/deadline-badge";
import { SharePlanButton } from "@/components/plan/share-plan-button";
import { SearchButton } from "@/components/search-button";
import { StatTile } from "@/components/stat-tile";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { capture } from "@/lib/analytics";
import type { ContentStep } from "@/lib/content/repo";
import { buildPlan, type PlanEntry } from "@/lib/plan/build-plan";
import { useProfile } from "@/lib/plan/use-profile";
import { useProgress } from "@/lib/plan/use-progress";
import { cn } from "@/lib/utils";

/** Deadline urgencies that count as "burning" (shared with Home). */
const BURNING_KINDS = new Set(["overdue", "today", "soon"]);

type Filter = "all" | "burning" | "done";
const FILTERS: Filter[] = ["all", "burning", "done"];

function isBurning(entry: PlanEntry<ContentStep>): boolean {
  return Boolean(entry.warning?.status && BURNING_KINDS.has(entry.warning.status.kind));
}

export function PlanView({ steps }: { steps: ContentStep[] }) {
  const tNav = useTranslations("nav");
  const tPlan = useTranslations("plan");
  const tHome = useTranslations("home");
  const tOnb = useTranslations("onboarding");
  const tStep = useTranslations("step");
  const { isDone, toggle, done } = useProgress();
  // `undefined` while the client-only profile is still loading (avoids flashing
  // the invite state before it resolves).
  const { profile, loaded } = useProfile();
  const [filter, setFilter] = useState<Filter>("all");

  const plan = useMemo(() => (profile ? buildPlan(profile, steps) : null), [profile, steps]);

  const total = plan?.entries.length ?? 0;
  const doneCount = useMemo(
    () => (plan ? plan.entries.filter((e) => isDone(e.step.slug)).length : 0),
    [plan, isDone],
  );
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const burningCount = useMemo(() => (plan ? plan.entries.filter(isBurning).length : 0), [plan]);

  // Filter each stage group, then drop groups the filter empties out.
  const groups = useMemo(() => {
    if (!plan) return [];
    return plan.stages
      .map((group) => ({
        stage: group.stage,
        entries: group.entries.filter((e) => {
          if (filter === "burning") return isBurning(e);
          if (filter === "done") return isDone(e.step.slug);
          return true;
        }),
      }))
      .filter((group) => group.entries.length > 0);
  }, [plan, filter, isDone]);

  if (!loaded) {
    return (
      <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col pb-28">
        <header className="flex items-center justify-between px-4 pt-6">
          <span className="text-lg font-semibold tracking-tight">{tNav("plan")}</span>
          <SearchButton />
        </header>
        <main className="flex flex-1 flex-col gap-4 px-4 py-4" aria-hidden>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg" />
          <div className="flex flex-col gap-2 pt-4">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile || !plan) {
    return (
      <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col pb-28">
        <header className="flex items-center justify-between px-4 pt-6">
          <span className="text-lg font-semibold tracking-tight">{tNav("plan")}</span>
          <SearchButton />
        </header>
        <main className="flex flex-1 flex-col gap-4 px-4 pt-10">
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            {tHome("invite.title")}
          </h1>
          <p className="text-muted-foreground">{tHome("invite.subtitle")}</p>
          <Link
            href="/onboarding"
            className={buttonVariants({ size: "lg", className: "w-full" })}
            data-testid="plan-invite-cta"
          >
            {tHome("invite.cta")}
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col pb-28">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">{tPlan("title")}</span>
        <SearchButton />
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-4">
        <section className="flex flex-col gap-3" aria-label={tPlan("progressLabel")}>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label={tPlan("stats.done")} value={doneCount} color="bg-sec-mint" />
            <StatTile label={tPlan("stats.left")} value={total - doneCount} color="bg-sec-sky" />
            <StatTile label={tPlan("stats.burning")} value={burningCount} color="bg-sec-amber" />
          </div>
          <Progress
            value={pct}
            aria-label={tPlan("progressLabel")}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          <p className="text-sm text-muted-foreground" data-testid="plan-progress">
            {tPlan("progress", { done: doneCount, total })}
          </p>
        </section>

        {total > 0 && <SharePlanButton answers={profile} done={done} />}

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList aria-label={tPlan("filters.label")}>
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f} data-testid={`plan-filter-${f}`}>
                {tPlan(`filters.${f}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={filter} className="flex flex-col gap-6" data-testid="plan-list">
            {groups.length === 0 ? (
              <p
                className="rounded-xl border border-border px-4 py-6 text-center text-sm text-muted-foreground"
                data-testid="plan-empty"
              >
                {tPlan(`empty.${filter}`)}
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.stage ?? "none"} className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {group.stage ? tOnb(`stages.${group.stage}`) : tOnb("preview.noStage")}
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {group.entries.map((e, i) => {
                      const done = isDone(e.step.slug);
                      return (
                        <li
                          key={e.step.slug}
                          style={{ "--i": i } as CSSProperties}
                          className="stagger-item flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors"
                          data-testid="plan-step"
                          data-slug={e.step.slug}
                        >
                          <Checkbox
                            checked={done}
                            onCheckedChange={() => {
                              toggle(e.step.slug);
                              if (!done) capture("step_done", { slug: e.step.slug });
                            }}
                            aria-label={done ? tStep("done") : tStep("todo")}
                          />
                          <Link
                            href={`/guides/${e.step.section_slug}/${e.step.slug}`}
                            className={cn(
                              "flex-1 text-sm transition-colors",
                              done && "text-muted-foreground",
                            )}
                          >
                            <span className="strike-anim" data-done={done}>
                              {e.step.title}
                            </span>
                          </Link>
                          {e.warning?.due && <DeadlineBadge due={new Date(e.warning.due)} />}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
