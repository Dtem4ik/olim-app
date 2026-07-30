import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeView } from "@/components/home/home-view";
import { JsonLd } from "@/components/seo/json-ld";
import { getContent } from "@/lib/content/repo";
import { routeOpenGraph } from "@/lib/seo/open-graph";
import { siteJsonLd } from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/site-url";

// ISR — home reflects new content within the hour, and immediately on
// content:import revalidation, without a redeploy (Phase 6b freshness).
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    // `absolute` bypasses the layout's `%s — Olim` template — the home title
    // already carries the brand, so the template would double it.
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: routeOpenGraph({ url: "/", title, description }),
    // twitter tags are auto-derived from openGraph + the root opengraph-image
    // (yields summary_large_image), matching the section/step routes.
  };
}

/**
 * Personalized home. Content is read server-side (Supabase → fixtures fallback);
 * the personal plan is computed client-side from the localStorage profile.
 */
export default async function HomePage() {
  const { sections, steps } = await getContent();
  const t = await getTranslations("app");
  return (
    <>
      <JsonLd
        data={siteJsonLd({
          siteUrl: getSiteUrl(),
          name: t("name"),
          description: t("tagline"),
        })}
      />
      <HomeView sections={sections} steps={steps} />
    </>
  );
}
