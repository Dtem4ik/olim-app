import { getTranslations } from "next-intl/server";
import { type LocaleParams, pageLocale } from "@/i18n/params";
import { routing } from "@/i18n/routing";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

// Site-wide default OG/Twitter image (Phase 11 SEO). Applies to every route that
// doesn't define its own `opengraph-image` — home, /about, etc. Section and step
// routes override it with their topic-specific image.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — навигатор адаптации для репатриантов в Израиле";

/** One static image per locale (built at deploy, like the pages). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const [tApp, tHome] = await Promise.all([
    getTranslations({ locale, namespace: "app" }),
    getTranslations({ locale, namespace: "home" }),
  ]);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tApp("tagline"),
    title: tHome("invite.title"),
    subtitle: null,
  });
}
