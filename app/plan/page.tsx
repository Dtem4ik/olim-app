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
  const t = await getTranslations("plan");
  return (
    <>
      {/* Server-rendered landing intro: gives the route a real crawlable H1 +
          lead (PlanView is client-only and SSRs a skeleton), and reads as a
          clear page title for visitors arriving from search. */}
      <header className="mx-auto w-full max-w-md px-4 pt-6">
        <h1 className="text-balance text-2xl font-bold tracking-tight">{t("landingHeading")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("landingLead")}</p>
      </header>
      <PlanView steps={steps} />
    </>
  );
}
