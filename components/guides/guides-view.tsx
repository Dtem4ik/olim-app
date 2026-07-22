"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { SearchButton } from "@/components/search-button";
import { SectionTile } from "@/components/section-tile";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentSection, ContentStep } from "@/lib/content/repo";
import { useProfile } from "@/lib/plan/use-profile";
import { sectionColor } from "@/lib/section-colors";
import { sectionIcon } from "@/lib/section-icons";

export function GuidesView({
  sections,
  steps,
}: {
  sections: ContentSection[];
  steps: ContentStep[];
}) {
  const t = useTranslations("guides");
  const { profile, loaded } = useProfile();

  // The guides grid is the browse-everything entry, so counts are the full
  // guide (the section page floats a reader's matched steps to the top).
  const countFor = useMemo(() => {
    return (slug: string) => steps.filter((s) => s.section_slug === slug).length;
  }, [steps]);

  return (
    <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col pb-28">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">{t("title")}</span>
        <SearchButton />
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 py-4">
        {loaded ? (
          <p className="text-sm text-muted-foreground">
            {profile ? t("personalizedHint") : t("allHint")}
          </p>
        ) : (
          <Skeleton className="h-5 w-64" />
        )}
        <div className="grid grid-cols-2 gap-3" data-testid="sections-grid">
          {sections.map((s) => (
            <SectionTile
              key={s.slug}
              title={s.title}
              description={s.description ?? undefined}
              icon={sectionIcon(s.icon)}
              href={`/guides/${s.slug}`}
              count={countFor(s.slug)}
              color={sectionColor(s.slug)}
              imageUrl={s.image_url ?? undefined}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
