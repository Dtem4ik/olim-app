import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { getContent } from "@/lib/content/repo";
import { localePath } from "@/lib/seo/i18n";
import { getSiteUrl } from "@/lib/site-url";

// Regenerate with the content pages (Phase 6b) — new sections/steps appear in the
// sitemap within the hour, and immediately on content:import revalidation.
export const revalidate = 3600;

/**
 * sitemap.xml built from the DB: the public entry points plus every section and
 * step. /plan and /onboarding are included as indexable conversion landings.
 * Excluded: /search, /offline, /profile, /plan/[slug] — they're noindex and
 * carry no SEO value.
 *
 * Fully translated UI routes (home, /onboarding, /plan, /about) are listed in
 * every locale with hreflang alternates. Guides stay Russian-only here: their
 * text isn't translated yet, so the /en copies are noindex.
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

  const translated: MetadataRoute.Sitemap[number][] = [
    { url: "/", lastModified: corpusModified, changeFrequency: "weekly", priority: 1 },
    { url: "/onboarding", changeFrequency: "monthly", priority: 0.8 },
    { url: "/plan", changeFrequency: "monthly", priority: 0.8 },
    { url: "/about", changeFrequency: "monthly", priority: 0.5 },
  ];
  const translatedRoutes: MetadataRoute.Sitemap = translated.flatMap((route) => {
    // Mirrors the pages' hreflang (lib/seo/i18n.ts), x-default → Russian.
    const languages = Object.fromEntries([
      ["x-default", `${base}${route.url}`],
      ...locales.map((l) => [l, `${base}${localePath(l, route.url)}`]),
    ]);
    return locales.map((l) => ({
      ...route,
      url: `${base}${localePath(l, route.url)}`,
      alternates: { languages },
    }));
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    ...translatedRoutes,
    {
      url: `${base}/guides`,
      lastModified: corpusModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
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
