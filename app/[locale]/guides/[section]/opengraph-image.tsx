import { getTranslations } from "next-intl/server";
import { pageLocale } from "@/i18n/params";
import { getContent } from "@/lib/content/repo";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — гид по адаптации";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const locale = await pageLocale(params);
  const { section } = await params;
  const [{ sections }, tApp, tGuides] = await Promise.all([
    getContent(),
    getTranslations({ locale, namespace: "app" }),
    getTranslations({ locale, namespace: "guides" }),
  ]);
  const sec = sections.find((s) => s.slug === section);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: tGuides("title"),
    title: sec?.title ?? tGuides("title"),
    subtitle: sec?.description ?? null,
  });
}
