import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuidesView } from "@/components/guides/guides-view";
import { getContent } from "@/lib/content/repo";
import { routeOpenGraph } from "@/lib/seo/open-graph";

// ISR — regenerates hourly + on content:import revalidation (Phase 6b freshness).
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [t, { sections, steps }] = await Promise.all([getTranslations("guides"), getContent()]);
  const title = t("metaTitle");
  // Count-derived so the numbers stay honest as the corpus grows (Phase 6b freshness).
  const description = t("metaDescription", { sections: sections.length, steps: steps.length });
  return {
    title,
    description,
    alternates: { canonical: "/guides" },
    openGraph: routeOpenGraph({ url: "/guides", title, description }),
    // twitter tags are auto-derived from openGraph + the guides opengraph-image
    // (yields summary_large_image), matching the section/step routes.
  };
}

export default async function GuidesPage() {
  const { sections, steps } = await getContent();
  return <GuidesView sections={sections} steps={steps} />;
}
