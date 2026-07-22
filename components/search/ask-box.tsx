"use client";

import { ChevronRight, Loader2, SendHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { SectionTile } from "@/components/section-tile";
import { Button } from "@/components/ui/button";
import { capture } from "@/lib/analytics";
import type { ContentSection } from "@/lib/content/repo";
import type { Source } from "@/lib/rag/types";
import { sectionColor } from "@/lib/section-colors";
import { sectionIcon } from "@/lib/section-icons";
import { cn } from "@/lib/utils";

type Status = "idle" | "thinking" | "streaming" | "done" | "refused" | "error" | "rate_limited";

interface AskEventData {
  sources?: Source[];
  text?: string;
  refused?: boolean;
  citedSlugs?: string[];
  model?: string;
}

/**
 * "Спроси об Израиле" — grounded AI answer above the keyword search (Phase 8b).
 * Streams the answer from POST /api/ask (SSE), then renders source cards that
 * deep-link to the SSR step sheet. On the refusal path it shows the closest
 * sections. Keyword search below is untouched — the AI augments, never replaces.
 */
export function AskBox({ sections }: { sections: ContentSection[] }) {
  const t = useTranslations("search.ask");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [cited, setCited] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const abortRef = useRef<AbortController | null>(null);

  async function ask(e: React.SyntheticEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length === 0 || status === "thinking" || status === "streaming") return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAnswer("");
    setSources([]);
    setCited([]);
    setStatus("thinking");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
        signal: ctrl.signal,
      });
      if (res.status === 429) return setStatus("rate_limited");
      if (!res.ok || !res.body) return setStatus("error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let refused = false;
      let citedSlugs: string[] = [];
      let model = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let sep = buf.indexOf("\n\n");
        while (sep !== -1) {
          const frame = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          sep = buf.indexOf("\n\n");
          const type = frame.match(/^event: (.*)$/m)?.[1];
          const dataRaw = frame.match(/^data: (.*)$/m)?.[1];
          if (!type || dataRaw === undefined) continue;
          const data = JSON.parse(dataRaw) as AskEventData;
          if (type === "sources") setSources(data.sources ?? []);
          else if (type === "text") {
            setStatus("streaming");
            setAnswer((prev) => prev + (data.text ?? ""));
          } else if (type === "done") {
            refused = data.refused ?? false;
            citedSlugs = data.citedSlugs ?? [];
            model = data.model ?? "";
          } else if (type === "error") setStatus("error");
        }
      }

      setCited(citedSlugs);
      setStatus((s) => (s === "error" ? s : refused ? "refused" : "done"));
      capture("ai_answered", { refused, cited: citedSlugs.length, model });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("error");
    }
  }

  const busy = status === "thinking" || status === "streaming";
  // Sources to show under an answer: the cited subset, or all retrieved as a fallback.
  const citedSources = cited.length > 0 ? sources.filter((s) => cited.includes(s.slug)) : sources;
  // Refusal path: the unique sections behind the retrieved (closest) steps.
  const closeSections = uniqueSections(sources, sections);

  return (
    <section
      aria-label={t("title")}
      className="rounded-3xl border border-border bg-gradient-to-b from-surface to-surface/50 p-4 shadow-sm"
    >
      <form onSubmit={ask} className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 px-0.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold">{t("title")}</span>
        </div>

        {/* Reads like the search input at rest (one line, h-11); grows with the text. */}
        <div className="flex items-end gap-1.5 rounded-2xl border bg-background py-1 pr-1 pl-3 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
          <label htmlFor="ask-input" className="sr-only">
            {t("title")}
          </label>
          <textarea
            id="ask-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onInput={autoGrow}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter makes a newline.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(e);
              }
            }}
            placeholder={t("placeholder")}
            enterKeyHint="send"
            rows={1}
            className="max-h-40 min-h-9 min-w-0 flex-1 resize-none self-center bg-transparent py-1.5 text-base leading-6 outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon-sm"
            className="shrink-0 rounded-full"
            disabled={busy || question.trim().length === 0}
            aria-label={t("submit")}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="size-4" aria-hidden />
            )}
          </Button>
        </div>
        <p className="px-0.5 text-xs text-muted-foreground">{t("hint")}</p>
      </form>

      {status !== "idle" && (
        <div className="mt-3 flex flex-col gap-3" aria-live="polite" aria-busy={busy}>
          {status === "thinking" && <ThinkingRow label={t("thinking")} />}

          {status === "rate_limited" && (
            <p className="rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground">
              {t("rateLimited")}
            </p>
          )}
          {status === "error" && (
            <p className="rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground">
              {t("error")}
            </p>
          )}

          {answer.length > 0 && status !== "refused" && (
            <div className="rounded-2xl border border-primary/15 bg-primary/[0.06] px-4 py-3.5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {answer}
                {status === "streaming" && (
                  <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-primary align-middle" />
                )}
              </p>
            </div>
          )}

          {(status === "streaming" || status === "done") && citedSources.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("sources")}
              </h3>
              {citedSources.map((s) => (
                <SourceCard key={s.slug} source={s} />
              ))}
            </div>
          )}

          {status === "done" && (
            <p className="px-1 text-xs text-muted-foreground">{t("disclaimer")}</p>
          )}

          {status === "refused" && (
            <div className="flex flex-col gap-3">
              <p className="rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground">
                {t("refused")}
              </p>
              {closeSections.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {closeSections.map((s) => (
                    <SectionTile
                      key={s.slug}
                      title={s.title}
                      description={s.description ?? undefined}
                      icon={sectionIcon(s.icon)}
                      href={`/guides/${s.slug}`}
                      color={sectionColor(s.slug)}
                      imageUrl={s.image_url ?? undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Streaming placeholder: a soft label with three pulsing dots. */
function ThinkingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-primary/15 bg-primary/[0.06] px-4 py-3.5 text-sm text-muted-foreground">
      <span className="flex gap-1" aria-hidden>
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary" />
      </span>
      {label}
    </div>
  );
}

/** Grow the textarea to fit its content, up to the CSS max-height. */
function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
  const el = e.currentTarget;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function SourceCard({ source }: { source: Source }) {
  const Icon = sectionIcon(source.section_icon);
  return (
    <Link
      href={`/guides/${source.section_slug}/${source.slug}`}
      data-testid="ask-source"
      className="flex items-center gap-3 rounded-2xl border border-border p-3 transition-transform active:scale-[0.99]"
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl text-foreground",
          sectionColor(source.section_slug),
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{source.title}</span>
        <span className="truncate text-xs text-muted-foreground">{source.section_title}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

/** Unique sections behind a list of sources, hydrated from the full section list. */
function uniqueSections(sources: Source[], sections: ContentSection[]): ContentSection[] {
  const bySlug = new Map(sections.map((s) => [s.slug, s]));
  const seen = new Set<string>();
  const out: ContentSection[] = [];
  for (const src of sources) {
    if (seen.has(src.section_slug)) continue;
    seen.add(src.section_slug);
    const section = bySlug.get(src.section_slug);
    if (section) out.push(section);
  }
  return out;
}
