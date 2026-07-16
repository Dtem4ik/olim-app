import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StatTile } from "@/components/stat-tile";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { loadSharedPlan } from "@/lib/share/load-shared-plan";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const plan = await loadSharedPlan(slug);
  const t = await getTranslations("sharedPlan");
  if (!plan) return { title: t("title") };
  const description = t("progress", { done: plan.doneCount, total: plan.total });
  return {
    title: t("title"),
    description,
    openGraph: { title: t("title"), description, url: `/plan/${slug}` },
    twitter: { card: "summary_large_image", title: t("title"), description },
    robots: { index: false },
  };
}

export default async function SharedPlanPage({ params }: PageProps) {
  const { slug } = await params;
  const plan = await loadSharedPlan(slug);
  if (!plan) notFound();

  const t = await getTranslations("sharedPlan");
  const tPlan = await getTranslations("plan");
  const tOnb = await getTranslations("onboarding");
  const tApp = await getTranslations("app");
  const pct = plan.total > 0 ? Math.round((plan.doneCount / plan.total) * 100) : 0;

  return (
    <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col pb-12">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">{tApp("name")}</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-4">
        <section className="flex flex-col gap-1 pt-2">
          <h1 className="text-3xl font-bold tracking-tight text-balance">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </section>

        <section className="flex flex-col gap-3" aria-label={t("title")}>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label={tPlan("stats.done")} value={plan.doneCount} color="bg-sec-mint" />
            <StatTile
              label={tPlan("stats.left")}
              value={plan.total - plan.doneCount}
              color="bg-sec-sky"
            />
          </div>
          <Progress value={pct} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
          <p className="text-sm text-muted-foreground" data-testid="shared-progress">
            {t("progress", { done: plan.doneCount, total: plan.total })}
          </p>
        </section>

        {plan.groups.length === 0 ? (
          <p className="rounded-2xl border border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          plan.groups.map((group) => (
            <section key={group.stage ?? "none"} className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {group.stage ? tOnb(`stages.${group.stage}`) : tOnb("preview.noStage")}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.entries.map((e) => (
                  <li
                    key={e.slug}
                    className="flex items-center gap-3 rounded-2xl border border-border p-3.5"
                    data-testid="shared-step"
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-lg border-2",
                        e.done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                      aria-hidden
                    >
                      {e.done && <Check className="size-4 stroke-[3]" />}
                    </span>
                    <span className={cn("flex-1 font-medium", e.done && "text-muted-foreground")}>
                      <span className="strike-anim" data-done={e.done}>
                        {e.title}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <section className="mt-2 flex flex-col gap-3 rounded-3xl bg-sec-lavender p-5 text-foreground">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold tracking-tight">{t("ctaTitle")}</h2>
            <p className="text-sm text-foreground/70">{t("ctaSubtitle")}</p>
          </div>
          <Link
            href="/onboarding"
            className={buttonVariants({ size: "lg", className: "w-full" })}
            data-testid="shared-cta"
          >
            {t("cta")}
          </Link>
        </section>
      </main>
    </div>
  );
}
