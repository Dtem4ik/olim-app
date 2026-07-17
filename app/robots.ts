import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * robots.txt. The public guide pages are crawlable; personal + utility routes are
 * kept out of the index (they're per-user or API surfaces, not content):
 *  - /plan and /plan/* — personal tracker + anonymous shared plans (also noindex).
 *  - /api/*            — data endpoints (search).
 *  - /onboarding, /search, /offline — utility screens with no SEO value.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/plan", "/api/", "/onboarding", "/search", "/offline"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
