import { getTranslations } from "next-intl/server";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

// OG/Twitter image for the /plan landing (Phase 11 SEO), so it unfurls with a
// large-image card like the other indexable routes.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — пошаговый план репатриации в Израиль";

export default async function Image() {
  const [tApp, tPlan] = await Promise.all([getTranslations("app"), getTranslations("plan")]);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tApp("tagline"),
    title: tPlan("metaTitle"),
    subtitle: null,
  });
}
