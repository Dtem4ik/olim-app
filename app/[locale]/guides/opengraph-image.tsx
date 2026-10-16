import { getTranslations } from "next-intl/server";
import { type LocaleParams, pageLocale } from "@/i18n/params";
import { routing } from "@/i18n/routing";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

// OG/Twitter image for the guides index (Phase 11 SEO). Section/step routes have
// their own; this covers /guides itself so a shared link unfurls on-topic.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — гиды для репатриантов в Израиле";

/** One static image per locale (built at deploy, like the pages). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const [tApp, tGuides] = await Promise.all([
    getTranslations({ locale, namespace: "app" }),
    getTranslations({ locale, namespace: "guides" }),
  ]);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tApp("tagline"),
    title: tGuides("title"),
    subtitle: tGuides("subtitle"),
  });
}
