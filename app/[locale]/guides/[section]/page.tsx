import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type SectionStep, SectionView } from "@/components/guides/section-view";
import { JsonLd } from "@/components/seo/json-ld";
import { pageLocale } from "@/i18n/params";
import { getContent } from "@/lib/content/repo";
import { renderMarkdown } from "@/lib/markdown";
import { untranslatedRouteSeo } from "@/lib/seo/i18n";
import { routeOpenGraph } from "@/lib/seo/open-graph";
import { sectionJsonLd } from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/site-url";

type Params = { params: Promise<{ locale: string; section: string }> };

// ISR — see the step route. Regenerates hourly + on content:import revalidation.
export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { section } = await params;
  const { sections } = await getContent();
  const sec = sections.find((s) => s.slug === section);
  if (!sec) return { title: "Guides" };
  const path = `/guides/${section}`;
  return {
    title: sec.title,
    description: sec.description ?? undefined,
    // Guide text is Russian-only for now: /en/... stays out of the index.
    ...untranslatedRouteSeo(locale, path),
    openGraph: routeOpenGraph({
      url: path,
      title: sec.title,
      description: sec.description ?? undefined,
    }),
  };
}

export default async function SectionPage({ params }: Params) {
  await pageLocale(params);
  const { section } = await params;
  const { sections, steps } = await getContent();
  const sec = sections.find((s) => s.slug === section);
  if (!sec) notFound();

  const sectionStepsRaw = steps.filter((s) => s.section_slug === section);
  const sectionSteps: SectionStep[] = sectionStepsRaw.map((s) => ({
    ...s,
    bodyHtml: renderMarkdown(s.body_md),
  }));

  return (
    <>
      <JsonLd
        data={sectionJsonLd({ siteUrl: getSiteUrl(), section: sec, steps: sectionStepsRaw })}
      />
      <SectionView section={sec} steps={sectionSteps} />
    </>
  );
}
