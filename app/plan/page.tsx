import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlanView } from "@/components/plan/plan-view";
import { getContent } from "@/lib/content/repo";
import { routeOpenGraph } from "@/lib/seo/open-graph";

// Indexable conversion landing ("build your step-by-step aliyah plan"). The
// personal plan is computed client-side from localStorage, so the crawled HTML
// is the same generic landing for everyone — no personal data is indexed.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("plan");
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: { canonical: "/plan" },
    openGraph: routeOpenGraph({ url: "/plan", title, description }),
  };
}

export default async function PlanPage() {
  const { steps } = await getContent();
  return <PlanView steps={steps} />;
}
