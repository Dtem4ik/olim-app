import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuidesView } from "@/components/guides/guides-view";
import { getContent } from "@/lib/content/repo";

// ISR — regenerates hourly + on content:import revalidation (Phase 6b freshness).
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guides");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/guides" },
    openGraph: { type: "website", url: "/guides", title: t("title"), description: t("subtitle") },
  };
}

export default async function GuidesPage() {
  const { sections, steps } = await getContent();
  return <GuidesView sections={sections} steps={steps} />;
}
