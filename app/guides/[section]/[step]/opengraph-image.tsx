import { getTranslations } from "next-intl/server";
import { getContent } from "@/lib/content/repo";
import { OG_CONTENT_TYPE, OG_SIZE, renderGuideOg } from "@/lib/og/guide-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Olim — шаг адаптации";

export default async function Image({
  params,
}: {
  params: Promise<{ section: string; step: string }>;
}) {
  const { section, step } = await params;
  const [{ sections, steps }, tApp] = await Promise.all([getContent(), getTranslations("app")]);
  const sec = sections.find((s) => s.slug === section);
  const st = steps.find((s) => s.slug === step && s.section_slug === section);
  return renderGuideOg({
    brand: tApp("name"),
    eyebrow: sec?.title ?? tApp("name"),
    title: st?.title ?? tApp("name"),
    subtitle: st?.summary ?? null,
  });
}
