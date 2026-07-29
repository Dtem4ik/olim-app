import { getTranslations } from "next-intl/server";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

// Site-wide default OG/Twitter image (Phase 11 SEO). Applies to every route that
// doesn't define its own `opengraph-image` — home, /about, etc. Section and step
// routes override it with their topic-specific image.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — навигатор адаптации для репатриантов в Израиле";

export default async function Image() {
  const [tApp, tHome] = await Promise.all([getTranslations("app"), getTranslations("home")]);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tApp("tagline"),
    title: tHome("invite.title"),
    subtitle: null,
  });
}
