import { getTranslations } from "next-intl/server";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

// OG/Twitter image for /about (Phase 11 SEO), so a shared link unfurls on-topic
// with the large-image card like the guides/section/step routes.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — о приложении";

export default async function Image() {
  const [tApp, tAbout] = await Promise.all([getTranslations("app"), getTranslations("about")]);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tApp("tagline"),
    title: tAbout("title"),
    subtitle: null,
  });
}
