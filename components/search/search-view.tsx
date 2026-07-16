"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { SearchBar } from "@/components/search-bar";
import { sectionColor } from "@/lib/section-colors";
import { sectionIcon } from "@/lib/section-icons";
import { cn } from "@/lib/utils";

export interface SearchSection {
  slug: string;
  title: string;
  icon: string | null;
}
export interface SearchStep {
  slug: string;
  section_slug: string;
  title: string;
  summary: string | null;
}

const norm = (s: string) => s.toLowerCase().trim();

export function SearchView({
  sections,
  steps,
}: {
  sections: SearchSection[];
  steps: SearchStep[];
}) {
  const t = useTranslations("search");
  const tNav = useTranslations("nav");
  const [query, setQuery] = useState("");

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

  const q = norm(query);
  const results = useMemo(() => {
    if (q.length === 0) return { sections: [], steps: [] };
    return {
      sections: sections.filter((s) => norm(s.title).includes(q)),
      steps: steps.filter(
        (s) => norm(s.title).includes(q) || (s.summary ? norm(s.summary).includes(q) : false),
      ),
    };
  }, [q, sections, steps]);

  const sectionTitle = (slug: string) => sections.find((s) => s.slug === slug)?.title ?? "";
  const hasResults = results.sections.length > 0 || results.steps.length > 0;

  return (
    <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col">
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

      <main className="flex flex-1 flex-col gap-6 px-4 py-4">
        {q.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">{t("hint")}</p>
        ) : !hasResults ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">{t("empty", { query })}</p>
        ) : (
          <>
            {results.sections.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("sections")}
                </h2>
                {results.sections.map((s) => {
                  const Icon = sectionIcon(s.icon);
                  return (
                    <ResultRow
                      key={s.slug}
                      href={`/guides/${s.slug}`}
                      title={s.title}
                      color={sectionColor(s.slug)}
                      icon={<Icon className="size-5" aria-hidden />}
                    />
                  );
                })}
              </section>
            )}

            {results.steps.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("steps")}
                </h2>
                {results.steps.map((s) => {
                  const Icon = sectionIcon(
                    sections.find((x) => x.slug === s.section_slug)?.icon ?? null,
                  );
                  return (
                    <ResultRow
                      key={s.slug}
                      href={`/guides/${s.section_slug}/${s.slug}`}
                      title={s.title}
                      subtitle={sectionTitle(s.section_slug)}
                      color={sectionColor(s.section_slug)}
                      icon={<Icon className="size-5" aria-hidden />}
                    />
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ResultRow({
  href,
  title,
  subtitle,
  color,
  icon,
}: {
  href: string;
  title: string;
  subtitle?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
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
        {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
