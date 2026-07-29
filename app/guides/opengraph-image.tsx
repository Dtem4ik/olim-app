import { getTranslations } from "next-intl/server";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

// OG/Twitter image for the guides index (Phase 11 SEO). Section/step routes have
// their own; this covers /guides itself so a shared link unfurls on-topic.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — гиды для репатриантов в Израиле";

export default async function Image() {
  const [tApp, tGuides] = await Promise.all([getTranslations("app"), getTranslations("guides")]);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tApp("tagline"),
    title: tGuides("title"),
    subtitle: tGuides("subtitle"),
  });
}
