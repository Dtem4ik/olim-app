import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuidesView } from "@/components/guides/guides-view";
import { getContent } from "@/lib/content/repo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guides");
  return { title: t("title") };
}

export default async function GuidesPage() {
  const { sections, steps } = await getContent();
  return <GuidesView sections={sections} steps={steps} />;
}
