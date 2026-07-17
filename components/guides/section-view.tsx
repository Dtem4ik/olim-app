"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type CSSProperties, type MouseEvent, useEffect, useMemo, useState } from "react";
import { DeadlineBadge } from "@/components/deadline-badge";
import { StepBody } from "@/components/guides/step-body";
import { SearchButton } from "@/components/search-button";
import { ShareButton } from "@/components/share-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { capture } from "@/lib/analytics";
import type { ContentSection, ContentStep } from "@/lib/content/repo";
import { computeWarning, matchesCond, type PlanAnswers } from "@/lib/plan/build-plan";
import { loadProfile, type Profile } from "@/lib/plan/profile";
import { useProgress } from "@/lib/plan/use-progress";
import { sectionColor } from "@/lib/section-colors";
import { sectionIcon } from "@/lib/section-icons";
import { cn } from "@/lib/utils";

export type SectionStep = ContentStep & { bodyHtml: string };

type Group = { key: string; label: string | null; items: SectionStep[] };

const byOrder = (a: SectionStep, b: SectionStep) =>
  a.sort_order - b.sort_order || a.slug.localeCompare(b.slug);

export function SectionView({
  section,
  steps,
  initialStepSlug,
}: {
  section: ContentSection;
  steps: SectionStep[];
  /** When set (a shared step URL), the section renders with this step's sheet
   *  already open — server-rendered for SEO, then it animates up on the client. */
  initialStepSlug?: string;
}) {
  const t = useTranslations("guides");
  const tStep = useTranslations("step");
  const router = useRouter();
  const { isDone, toggle } = useProgress();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(initialStepSlug ?? null);

  // Smart back: return to wherever the reader came from (home, guides, a deeper
  // section). Falls back to the Guides grid for direct/shared entries with no
  // in-app history. The href keeps it a real link for crawlers / no-JS.
  const handleBack = (e: MouseEvent) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };

  useEffect(() => setProfile(loadProfile()), []);
  useEffect(() => capture("section_opened", { section: section.slug }), [section.slug]);

  // Keep the URL in sync with the open sheet (replaceState — no history spam), so
  // a shared link stays correct as the reader opens, switches, or closes steps.
  useEffect(() => {
    const base = `/guides/${section.slug}`;
    window.history.replaceState(window.history.state, "", openSlug ? `${base}/${openSlug}` : base);
  }, [openSlug, section.slug]);

  // Everyone sees the whole guide; matched steps float to the top in their group.
  const groups: Group[] = useMemo(() => {
    if (!profile) return [{ key: "all", label: null, items: [...steps].sort(byOrder) }];
    const mine: SectionStep[] = [];
    const rest: SectionStep[] = [];
    for (const s of steps) {
      (matchesCond(s.cond, profile as PlanAnswers) ? mine : rest).push(s);
    }
    const out: Group[] = [];
    if (mine.length) out.push({ key: "your", label: t("yourSteps"), items: mine.sort(byOrder) });
    if (rest.length) out.push({ key: "other", label: t("otherSteps"), items: rest.sort(byOrder) });
    return out;
  }, [steps, profile, t]);

  const dueFor = (s: SectionStep) =>
    s.warn_rule && profile
      ? computeWarning(s.warn_rule, profile as PlanAnswers, new Date()).due
      : null;

  const handleToggle = (slug: string) => {
    const wasDone = isDone(slug);
    toggle(slug);
    if (!wasDone) capture("step_done", { slug, section: section.slug });
  };

  const selected = steps.find((s) => s.slug === openSlug) ?? null;

  return (
    <>
      <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col pb-28">
        <header className="flex items-center justify-between px-4 pt-6">
          <Link
            href="/guides"
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
          <div className="flex items-center gap-2">
            <ShareButton path={`/guides/${section.slug}`} title={section.title} />
            <SearchButton />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 px-4 py-4">
          <SectionHero section={section} titleIsHeading={openSlug === null} />
          <p className="px-1 text-xs text-muted-foreground">
            {profile ? t("personalizedHint") : t("allHint")}
          </p>

          {steps.length === 0 ? (
            <p className="rounded-xl border border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <div className="flex flex-col gap-6" data-testid="section-steps">
              {groups.map((g) => (
                <section key={g.key} className="flex flex-col gap-2">
                  {g.label && (
                    <h2 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {g.label}
                    </h2>
                  )}
                  <ul className="flex flex-col gap-2">
                    {g.items.map((s, i) => (
                      <StepRow
                        key={s.slug}
                        step={s}
                        index={i}
                        done={isDone(s.slug)}
                        due={dueFor(s)}
                        checkLabel={isDone(s.slug) ? tStep("done") : tStep("todo")}
                        onToggle={() => handleToggle(s.slug)}
                        onOpen={() => setOpenSlug(s.slug)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>

      <BottomSheet
        open={selected !== null}
        onClose={() => setOpenSlug(null)}
        ariaLabel={selected?.title}
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-balance">{selected.title}</h1>
              </div>
              <ShareButton
                path={`/guides/${section.slug}/${selected.slug}`}
                title={selected.title}
                className="shrink-0"
              />
            </div>
            <StepBody sectionSlug={section.slug} step={selected} />
          </div>
        )}
      </BottomSheet>
    </>
  );
}

function StepRow({
  step,
  index,
  done,
  due,
  checkLabel,
  onToggle,
  onOpen,
}: {
  step: SectionStep;
  index: number;
  done: boolean;
  due: string | null;
  checkLabel: string;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <li
      style={{ "--i": index } as CSSProperties}
      className="stagger-item flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors"
      data-testid="step-item"
      data-slug={step.slug}
    >
      <Checkbox
        checked={done}
        onCheckedChange={onToggle}
        aria-label={checkLabel}
        data-testid="step-check"
      />
      <button
        type="button"
        onClick={onOpen}
        data-testid="step-open"
        className="flex min-w-0 flex-1 items-center gap-2 text-left transition-transform active:scale-[0.99]"
      >
        <span
          className={cn(
            "min-w-0 flex-1 font-medium leading-snug text-balance",
            done && "text-muted-foreground",
          )}
        >
          <span className="strike-anim" data-done={done}>
            {step.title}
          </span>
        </span>
        {due && <DeadlineBadge due={new Date(due)} className="shrink-0" />}
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  );
}

/** Section header banner: a photo hero when `image_url` is set, else a colour placeholder.
 *  `titleIsHeading` renders the section name as the page <h1>; it drops to <p> when a
 *  step sheet owns the h1 (e.g. on a shared step URL) so headings match the topic. */
function SectionHero({
  section,
  titleIsHeading,
}: {
  section: ContentSection;
  titleIsHeading: boolean;
}) {
  const Icon = sectionIcon(section.icon);
  const TitleTag = titleIsHeading ? "h1" : "p";
  return (
    <section
      className={cn(
        "relative flex h-52 flex-col justify-end overflow-hidden rounded-3xl p-5",
        !section.image_url && sectionColor(section.slug),
      )}
    >
      {section.image_url ? (
        <>
          <Image
            src={section.image_url}
            alt=""
            fill
            priority
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        </>
      ) : (
        <Icon
          className="absolute -top-4 -right-3 size-32 text-foreground/10"
          aria-hidden
          strokeWidth={1.5}
        />
      )}
      <div className={cn("relative flex flex-col gap-1", section.image_url && "text-white")}>
        <TitleTag className="text-3xl font-bold tracking-tight text-balance">
          {section.title}
        </TitleTag>
        {section.description && (
          <p className={cn("text-sm", section.image_url ? "text-white/80" : "text-foreground/70")}>
            {section.description}
          </p>
        )}
      </div>
    </section>
  );
}
