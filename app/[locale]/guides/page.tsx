import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuidesView } from "@/components/guides/guides-view";
import { JsonLd } from "@/components/seo/json-ld";
import { type LocaleParams, pageLocale } from "@/i18n/params";
import { getContent } from "@/lib/content/repo";
import { localeAlternates } from "@/lib/seo/i18n";
import { routeOpenGraph } from "@/lib/seo/open-graph";
import { guidesJsonLd } from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/site-url";

// ISR — regenerates hourly + on content:import revalidation (Phase 6b freshness).
export const revalidate = 3600;

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const [t, { sections, steps }] = await Promise.all([getTranslations("guides"), getContent()]);
  const title = t("metaTitle");
  // Count-derived so the numbers stay honest as the corpus grows (Phase 6b freshness).
  const description = t("metaDescription", { sections: sections.length, steps: steps.length });
  return {
    title,
    description,
    // The index lists Russian-only section titles → /en canonicalizes to Russian.
    alternates: localeAlternates(locale, "/guides", { translated: false }),
    openGraph: routeOpenGraph({ url: "/guides", title, description }),
    // twitter tags are auto-derived from openGraph + the guides opengraph-image
    // (yields summary_large_image), matching the section/step routes.
  };
}

export default async function GuidesPage({ params }: LocaleParams) {
  await pageLocale(params);
  const [{ sections, steps }, tNav] = await Promise.all([getContent(), getTranslations("nav")]);
  return (
    <>
      <JsonLd
        data={guidesJsonLd({
          siteUrl: getSiteUrl(),
          sections,
          homeLabel: tNav("home"),
          guidesLabel: tNav("guides"),
        })}
      />
      <GuidesView sections={sections} steps={steps} />
    </>
  );
}
