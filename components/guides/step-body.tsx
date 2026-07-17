"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { reportOutdated } from "@/app/guides/actions";
import { DeadlineBadge } from "@/components/deadline-badge";
import { MarkdownBody } from "@/components/guides/markdown-body";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { capture } from "@/lib/analytics";
import type { ContentStep } from "@/lib/content/repo";
import { computeWarning, type PlanAnswers } from "@/lib/plan/build-plan";
import { loadProfile, type Profile } from "@/lib/plan/profile";
import { useProgress } from "@/lib/plan/use-progress";
import { cn } from "@/lib/utils";

export type DetailStep = ContentStep & { bodyHtml: string };

/** The shared body of a step: pills, mark-done, docs, markdown, tips, trust.
 *  Rendered inside both the full-screen detail route and the bottom sheet. */
export function StepBody({ sectionSlug, step }: { sectionSlug: string; step: DetailStep }) {
  const t = useTranslations("step");
  const tOnb = useTranslations("onboarding");
  const { isDone, toggle } = useProgress();
  const done = isDone(step.slug);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => setProfile(loadProfile()), []);

  const warningDue = useMemo(() => {
    if (!step.warn_rule || !profile) return null;
    return computeWarning(step.warn_rule, profile as PlanAnswers, new Date()).due;
  }, [step.warn_rule, profile]);

  return (
    <div className="flex flex-col gap-5">
      {(step.stage || warningDue) && (
        <div className="flex flex-wrap items-center gap-2">
          {step.stage && (
            <span className="rounded-full bg-sec-lavender px-3 py-1 text-xs font-medium text-foreground">
              {tOnb(`stages.${step.stage}`)}
            </span>
          )}
          {warningDue && <DeadlineBadge due={new Date(warningDue)} />}
        </div>
      )}

      <button
        type="button"
        aria-pressed={done}
        onClick={() => {
          toggle(step.slug);
          if (!done) capture("step_done", { slug: step.slug, section: sectionSlug });
        }}
        className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition-transform active:scale-[0.99]"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
            done ? "border-primary bg-primary text-primary-foreground" : "border-input",
          )}
          aria-hidden
        >
          {done && <Check className="size-4 stroke-[3]" />}
        </span>
        <span className={cn("font-medium", done && "text-muted-foreground")}>
          {done ? t("done") : t("todo")}
        </span>
      </button>

      {step.summary && <p className="font-medium">{step.summary}</p>}

      {step.docs.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t("bring")}
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {step.docs.map((d) => (
              <li key={d.label} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>
                  {d.label}
                  {d.note ? <span className="text-muted-foreground"> — {d.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <MarkdownBody html={step.bodyHtml} className="prose-step flex flex-col gap-2 text-sm" />

      {step.tips.map((tip) => (
        <blockquote
          key={tip.text}
          className="rounded-2xl border-l-2 border-primary bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
        >
          <p className="text-xs font-semibold uppercase tracking-wide">{t("tip")}</p>
          <p>{tip.text}</p>
        </blockquote>
      ))}

      <TrustFooter step={step} />
    </div>
  );
}

function TrustFooter({ step }: { step: DetailStep }) {
  const t = useTranslations("step");
  const [reporting, setReporting] = useState(false);
  const [sent, setSent] = useState(false);
  const [reason, setReason] = useState("");

  async function submit() {
    if (step.id) await reportOutdated(step.id, reason.trim() || null);
    capture("report_outdated", { slug: step.slug });
    setSent(true);
    setReporting(false);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{t("verified", { date: step.last_verified_at })}</span>
        <a href={step.source_url} target="_blank" rel="noopener noreferrer" className="underline">
          {t("source")}
        </a>
      </div>

      {sent ? (
        <p data-testid="report-thanks">{t("outdated.thanks")}</p>
      ) : reporting ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("outdated.placeholder")}
            aria-label={t("outdated.prompt")}
            rows={2}
            data-testid="report-reason"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} data-testid="report-submit">
              {t("outdated.submit")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReporting(false)}>
              {t("outdated.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="self-start underline"
          onClick={() => setReporting(true)}
          data-testid="report-open"
        >
          {t("outdated.button")}
        </button>
      )}
    </div>
  );
}
