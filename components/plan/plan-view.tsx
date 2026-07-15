"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { DeadlineBadge } from "@/components/deadline-badge";
import { SharePlanButton } from "@/components/plan/share-plan-button";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { capture } from "@/lib/analytics";
import type { ContentStep } from "@/lib/content/repo";
import { buildPlan, type PlanEntry } from "@/lib/plan/build-plan";
import { loadProfile, type Profile } from "@/lib/plan/profile";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => setProfile(loadProfile()), []);

  const plan = useMemo(() => (profile ? buildPlan(profile, steps) : null), [profile, steps]);

  const total = plan?.entries.length ?? 0;
  const doneCount = useMemo(
    () => (plan ? plan.entries.filter((e) => isDone(e.step.slug)).length : 0),
    [plan, isDone],
  );
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

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

  if (!profile || !plan) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-24">
        <header className="flex items-center justify-between px-4 pt-6">
          <span className="text-lg font-semibold tracking-tight">{tNav("plan")}</span>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 flex-col gap-4 px-4 pt-10">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
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
        <SiteBottomNav activeHref="/plan" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-24">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">{tPlan("title")}</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-4">
        <section className="flex flex-col gap-2" aria-label={tPlan("progressLabel")}>
          <p className="text-sm text-muted-foreground" data-testid="plan-progress">
            {tPlan("progress", { done: doneCount, total })}
          </p>
          <Progress
            value={pct}
            aria-label={tPlan("progressLabel")}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
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
              <p className="pt-2 text-sm text-muted-foreground" data-testid="plan-empty">
                {tPlan(`empty.${filter}`)}
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.stage ?? "none"} className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {group.stage ? tOnb(`stages.${group.stage}`) : tOnb("preview.noStage")}
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {group.entries.map((e) => {
                      const done = isDone(e.step.slug);
                      return (
                        <li
                          key={e.step.slug}
                          className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
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
                            href={`/guides/${e.step.section_slug}#${e.step.slug}`}
                            className={cn(
                              "flex-1 text-sm",
                              done && "text-muted-foreground line-through",
                            )}
                          >
                            {e.step.title}
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

      <SiteBottomNav activeHref="/plan" />
    </div>
  );
}
