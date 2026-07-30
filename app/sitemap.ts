import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content/repo";
import { getSiteUrl } from "@/lib/site-url";

// Regenerate with the content pages (Phase 6b) — new sections/steps appear in the
// sitemap within the hour, and immediately on content:import revalidation.
export const revalidate = 3600;

/**
 * sitemap.xml built from the DB: the public entry points plus every section and
 * step. Personal/utility routes (/plan, /onboarding, /search, /offline) are left
 * out — they're noindex and carry no SEO value.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const { sections, steps } = await getContent();

  const stepDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  // Newest last_verified_at across a set of steps → a real `lastmod` for the
  // pages that aggregate them (home, /guides, each section).
  const newest = (rows: typeof steps) => {
    let max: Date | undefined;
    for (const s of rows) {
      const d = stepDate(s.last_verified_at);
      if (d && (!max || d > max)) max = d;
    }
    return max;
  };
  const corpusModified = newest(steps);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: corpusModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/guides`,
      lastModified: corpusModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    { url: `${base}/onboarding`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/plan`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const sectionRoutes: MetadataRoute.Sitemap = sections.map((s) => ({
    url: `${base}/guides/${s.slug}`,
    lastModified: newest(steps.filter((st) => st.section_slug === s.slug)),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const stepRoutes: MetadataRoute.Sitemap = steps.map((s) => ({
    url: `${base}/guides/${s.section_slug}/${s.slug}`,
    lastModified: stepDate(s.last_verified_at),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...sectionRoutes, ...stepRoutes];
}
