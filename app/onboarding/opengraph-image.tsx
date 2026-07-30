import { getTranslations } from "next-intl/server";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

// OG/Twitter image for the /onboarding landing (Phase 11 SEO).
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — опрос для персонального плана репатриации";

export default async function Image() {
  const [tApp, tOnb] = await Promise.all([getTranslations("app"), getTranslations("onboarding")]);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tApp("tagline"),
    title: tOnb("metaTitle"),
    subtitle: null,
  });
}
