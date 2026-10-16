import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlanView } from "@/components/plan/plan-view";
import { type LocaleParams, pageLocale } from "@/i18n/params";
import { getContent } from "@/lib/content/repo";
import { localeAlternates, localePath } from "@/lib/seo/i18n";
import { routeOpenGraph } from "@/lib/seo/open-graph";

// ISR — picks up content:import within the hour even when the revalidation
// ping is skipped (no REVALIDATE_SECRET locally); was static until redeploy.
export const revalidate = 3600;

// Indexable conversion landing ("build your step-by-step aliyah plan"). The
// personal plan is computed client-side from localStorage, so the crawled HTML
// is the same generic landing for everyone — no personal data is indexed.
export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations("plan");
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: localeAlternates(locale, "/plan", { translated: true }),
    openGraph: routeOpenGraph({
      locale,
      url: localePath(locale, "/plan"),
      title,
      description,
    }),
  };
}

export default async function PlanPage({ params }: LocaleParams) {
  await pageLocale(params);
  const { steps } = await getContent();
  return <PlanView steps={steps} />;
}
