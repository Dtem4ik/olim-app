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

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/guides`, changeFrequency: "weekly", priority: 0.9 },
  ];

  const sectionRoutes: MetadataRoute.Sitemap = sections.map((s) => ({
    url: `${base}/guides/${s.slug}`,
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
