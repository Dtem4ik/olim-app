"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { reportOutdated } from "@/app/guides/actions";
import { DeadlineBadge } from "@/components/deadline-badge";
import { MarkdownBody } from "@/components/guides/markdown-body";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { capture } from "@/lib/analytics";
import { useProgress } from "@/lib/plan/use-progress";
import { cn } from "@/lib/utils";

export interface StepItemData {
  id: string | null;
  slug: string;
  sectionSlug: string;
  title: string;
  summary: string | null;
  bodyHtml: string;
  docs: { label: string; note?: string; required?: boolean }[];
  tips: { text: string; author?: string }[];
  stageLabel: string | null;
  sourceUrl: string;
  lastVerifiedAt: string;
  warningDue: string | null;
}

export function StepItem({ step }: { step: StepItemData }) {
  const t = useTranslations("step");
  const { isDone, toggle } = useProgress();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const done = isDone(step.slug);

  // Expand + scroll into view when linked from Home (`/guides/[section]#slug`).
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === `#${step.slug}`) {
      setOpen(true);
      ref.current?.scrollIntoView({ block: "start" });
    }
  }, [step.slug]);

  return (
    <article
      ref={ref}
      id={step.slug}
      className="scroll-mt-4 rounded-xl border border-border bg-card"
      data-testid="step-item"
      data-slug={step.slug}
    >
      <div className="flex items-start gap-3 p-4">
        <Checkbox
          checked={done}
          onCheckedChange={() => {
            toggle(step.slug);
            if (!done) capture("step_done", { slug: step.slug, section: step.sectionSlug });
          }}
          aria-label={done ? t("done") : t("todo")}
          className="mt-1"
          data-testid="step-check"
        />
        <button
          type="button"
          className="flex flex-1 items-start justify-between gap-3 text-left"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="flex flex-col gap-1">
            <span className={cn("font-medium", done && "text-muted-foreground line-through")}>
              {step.title}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {step.stageLabel && (
                <Badge variant="secondary" className="font-normal">
                  {step.stageLabel}
                </Badge>
              )}
              {step.warningDue && <DeadlineBadge due={new Date(step.warningDue)} />}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "mt-1 size-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4 text-sm">
          {step.summary && <p className="font-medium">{step.summary}</p>}

          {step.docs.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("bring")}
              </h3>
              <ul className="flex flex-col gap-1">
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

          <MarkdownBody html={step.bodyHtml} className="prose-step flex flex-col gap-2" />

          {step.tips.map((tip) => (
            <blockquote
              key={tip.text}
              className="rounded-lg border-l-2 border-primary bg-muted/40 px-3 py-2 text-muted-foreground"
            >
              <p className="text-xs font-semibold uppercase tracking-wide">{t("tip")}</p>
              <p>{tip.text}</p>
            </blockquote>
          ))}

          <TrustFooter step={step} />
        </div>
      )}
    </article>
  );
}

function TrustFooter({ step }: { step: StepItemData }) {
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
    <div className="flex flex-col gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{t("verified", { date: step.lastVerifiedAt })}</span>
        <a href={step.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
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
