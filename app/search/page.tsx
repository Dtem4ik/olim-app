import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SearchView } from "@/components/search/search-view";
import { getContent } from "@/lib/content/repo";
import { isAiConfigured } from "@/lib/rag/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search");
  // Search is a utility screen, not an SEO target — keep it out of the index.
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function SearchPage() {
  // Only the section list is server-rendered (for the empty-state suggestions and
  // to resolve result photos/descriptions). Query results come from /api/search.
  const { sections } = await getContent();
  return <SearchView sections={sections} aiEnabled={isAiConfigured()} />;
}
