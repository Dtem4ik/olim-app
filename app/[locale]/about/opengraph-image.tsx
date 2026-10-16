import { getTranslations } from "next-intl/server";
import { type LocaleParams, pageLocale } from "@/i18n/params";
import { routing } from "@/i18n/routing";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

// OG/Twitter image for /about (Phase 11 SEO), so a shared link unfurls on-topic
// with the large-image card like the guides/section/step routes.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — о приложении";

/** One static image per locale (built at deploy, like the pages). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const [tApp, tAbout] = await Promise.all([
    getTranslations({ locale, namespace: "app" }),
    getTranslations({ locale, namespace: "about" }),
  ]);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tApp("tagline"),
    title: tAbout("title"),
    subtitle: null,
  });
}
