import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SearchView } from "@/components/search/search-view";
import { getContent } from "@/lib/content/repo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search");
  return { title: t("title") };
}

export default async function SearchPage() {
  const { sections, steps } = await getContent();
  return (
    <SearchView
      sections={sections.map((s) => ({ slug: s.slug, title: s.title, icon: s.icon }))}
      steps={steps.map((s) => ({
        slug: s.slug,
        section_slug: s.section_slug,
        title: s.title,
        summary: s.summary,
      }))}
    />
  );
}
