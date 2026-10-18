import { getTranslations } from "next-intl/server";
import { type LocaleParams, pageLocale } from "@/i18n/params";
import { routing } from "@/i18n/routing";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

// OG/Twitter image for the /onboarding landing (Phase 11 SEO).
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — опрос для персонального плана репатриации";

/** One static image per locale (built at deploy, like the pages). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const [tApp, tOnb] = await Promise.all([
    getTranslations({ locale, namespace: "app" }),
    getTranslations({ locale, namespace: "onboarding" }),
  ]);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tApp("tagline"),
    title: tOnb("metaTitle"),
    subtitle: null,
  });
}
