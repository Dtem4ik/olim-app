"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { SearchBar } from "@/components/search-bar";
import { SectionTile } from "@/components/section-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { capture } from "@/lib/analytics";
import type { ContentSection } from "@/lib/content/repo";
import type { SearchResults } from "@/lib/search/types";
import { sectionColor } from "@/lib/section-colors";
import { sectionIcon } from "@/lib/section-icons";
import { cn } from "@/lib/utils";

const EMPTY: SearchResults = { steps: [], sections: [], source: "fixtures" };
const DEBOUNCE_MS = 200;

export function SearchView({ sections }: { sections: ContentSection[] }) {
  const t = useTranslations("search");
  const tNav = useTranslations("nav");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);

  // Restore the last query when returning from a result (it's kept in the URL),
  // so tapping the wrong result and pressing Back keeps the same search.
  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get("q");
    if (saved) setQuery(saved);
  }, []);

  // Mirror the query into the URL (replace — no history spam).
  useEffect(() => {
    const url = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
    window.history.replaceState(window.history.state, "", url);
  }, [query]);

  // Debounced server search. An AbortController drops stale in-flight requests so
  // fast typing never renders an earlier query's results out of order.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      abortRef.current?.abort();
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SearchResults;
        setResults(data);
        setLoading(false);
        capture("search_performed", {
          query: q,
          step_results: data.steps.length,
          section_results: data.sections.length,
          source: data.source,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // superseded
        setResults(EMPTY);
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const sectionBySlug = new Map(sections.map((s) => [s.slug, s]));
  const q = query.trim();
  const hasResults = results.steps.length > 0 || results.sections.length > 0;

  return (
    <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col pb-28">
      <header className="flex items-center gap-3 px-4 pt-6 pb-3">
        <Link
          href="/"
          aria-label={tNav("home")}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-surface text-surface-foreground transition-transform active:scale-90"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <SearchBar value={query} onChange={setQuery} placeholder={t("placeholder")} autoFocus />
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-4" aria-live="polite" aria-busy={loading}>
        {q.length === 0 ? (
          <SuggestSections sections={sections} label={t("suggest")} />
        ) : loading && !hasResults ? (
          <ResultsSkeleton />
        ) : !hasResults ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">{t("empty", { query })}</p>
        ) : (
          <>
            {results.steps.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("steps")}
                </h2>
                {results.steps.map((s) => {
                  const Icon = sectionIcon(s.section_icon);
                  return (
                    <StepResultRow
                      key={s.slug}
                      href={`/guides/${s.section_slug}/${s.slug}`}
                      title={s.title}
                      badge={s.section_title}
                      color={sectionColor(s.section_slug)}
                      icon={<Icon className="size-5" aria-hidden />}
                    />
                  );
                })}
              </section>
            )}

            {results.sections.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("sections")}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {results.sections.map((s) => {
                    const full = sectionBySlug.get(s.slug);
                    return (
                      <SectionTile
                        key={s.slug}
                        title={s.title}
                        description={full?.description ?? undefined}
                        icon={sectionIcon(s.icon)}
                        href={`/guides/${s.slug}`}
                        color={sectionColor(s.slug)}
                        imageUrl={full?.image_url ?? undefined}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/** Empty state: browse-all prompt over the section photo tiles. */
function SuggestSections({ sections, label }: { sections: ContentSection[]; label: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </h2>
      <div className="grid grid-cols-2 gap-3" data-testid="search-suggest-sections">
        {sections.map((s) => (
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
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-2" data-testid="search-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function StepResultRow({
  href,
  title,
  badge,
  color,
  icon,
}: {
  href: string;
  title: string;
  badge: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-testid="search-step-result"
      className="flex items-center gap-3 rounded-2xl border border-border p-3 transition-transform active:scale-[0.99]"
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl text-foreground",
          color,
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{badge}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
