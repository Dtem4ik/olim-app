import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type SectionStep, SectionView } from "@/components/guides/section-view";
import { JsonLd } from "@/components/seo/json-ld";
import { getContent } from "@/lib/content/repo";
import { renderMarkdown } from "@/lib/markdown";
import { stepJsonLd } from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/site-url";

type Params = { params: Promise<{ section: string; step: string }> };

// ISR: pages regenerate hourly, and on-demand when content:import fires the
// revalidate webhook — so new/edited content indexes without a redeploy (Phase 6b).
export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section, step } = await params;
  const { steps } = await getContent();
  const st = steps.find((s) => s.slug === step && s.section_slug === section);
  if (!st) return { title: "Guides" };
  const canonical = `/guides/${section}/${step}`;
  return {
    title: st.title,
    description: st.summary ?? undefined,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: st.title,
      description: st.summary ?? undefined,
    },
  };
}

// A shared step URL lands in its section with the step's sheet already open.
// The section (list + sheet content) is server-rendered, so it has real SSR/SEO
// while still opening the right step — with animation — on the client.
export default async function StepPage({ params }: Params) {
  const { section, step } = await params;
  const { sections, steps } = await getContent();
  const sec = sections.find((s) => s.slug === section);
  const st = steps.find((s) => s.slug === step && s.section_slug === section);
  if (!sec || !st) notFound();

  const sectionSteps: SectionStep[] = steps
    .filter((s) => s.section_slug === section)
    .map((s) => ({ ...s, bodyHtml: renderMarkdown(s.body_md) }));

  return (
    <>
      <JsonLd data={stepJsonLd({ siteUrl: getSiteUrl(), section: sec, step: st })} />
      <SectionView section={sec} steps={sectionSteps} initialStepSlug={step} />
    </>
  );
}
