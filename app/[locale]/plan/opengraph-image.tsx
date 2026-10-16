import { getTranslations } from "next-intl/server";
import { type LocaleParams, pageLocale } from "@/i18n/params";
import { routing } from "@/i18n/routing";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

// OG/Twitter image for the /plan landing (Phase 11 SEO), so it unfurls with a
// large-image card like the other indexable routes.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — пошаговый план репатриации в Израиль";

/** One static image per locale (built at deploy, like the pages). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const [tApp, tPlan] = await Promise.all([
    getTranslations({ locale, namespace: "app" }),
    getTranslations({ locale, namespace: "plan" }),
  ]);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tApp("tagline"),
    title: tPlan("metaTitle"),
    subtitle: null,
  });
}
