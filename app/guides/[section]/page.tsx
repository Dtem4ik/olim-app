import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type SectionStep, SectionView } from "@/components/guides/section-view";
import { getContent } from "@/lib/content/repo";
import { renderMarkdown } from "@/lib/markdown";

type Params = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section } = await params;
  const { sections } = await getContent();
  return { title: sections.find((s) => s.slug === section)?.title ?? "Guides" };
}

export default async function SectionPage({ params }: Params) {
  const { section } = await params;
  const { sections, steps } = await getContent();
  const sec = sections.find((s) => s.slug === section);
  if (!sec) notFound();

  const sectionSteps: SectionStep[] = steps
    .filter((s) => s.section_slug === section)
    .map((s) => ({ ...s, bodyHtml: renderMarkdown(s.body_md) }));

  return <SectionView section={sec} steps={sectionSteps} />;
}
