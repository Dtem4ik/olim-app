"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { DeadlineBadge } from "@/components/deadline-badge";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { capture } from "@/lib/analytics";
import type { ContentStep } from "@/lib/content/repo";
import { buildPlan } from "@/lib/plan/build-plan";
import { loadProfile, type Profile } from "@/lib/plan/profile";
import { useProgress } from "@/lib/plan/use-progress";
import { cn } from "@/lib/utils";

export function PlanView({ steps }: { steps: ContentStep[] }) {
  const tNav = useTranslations("nav");
  const tHome = useTranslations("home");
  const tOnb = useTranslations("onboarding");
  const tStep = useTranslations("step");
  const { isDone, toggle, count } = useProgress();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => setProfile(loadProfile()), []);

  const plan = useMemo(() => (profile ? buildPlan(profile, steps) : null), [profile, steps]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-24">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">{tNav("plan")}</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-4">
        {plan ? (
          <>
            <p className="text-sm text-muted-foreground">
              {count} / {plan.entries.length}
            </p>
            {plan.stages.map((group) => (
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
            ))}
          </>
        ) : (
          <section className="flex flex-col gap-4 pt-6">
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
          </section>
        )}
      </main>

      <SiteBottomNav activeHref="/plan" />
    </div>
  );
}
