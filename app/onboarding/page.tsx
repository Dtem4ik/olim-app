import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getContent } from "@/lib/content/repo";
import type { EngineStep } from "@/lib/plan/build-plan";
import { routeOpenGraph } from "@/lib/seo/open-graph";

// Indexable conversion landing: real server-rendered content (quiz intro) + its
// own metadata. Distinct intent from home/plan ("answer questions → get a plan").
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: { canonical: "/onboarding" },
    openGraph: routeOpenGraph({ url: "/onboarding", title, description }),
  };
}

/**
 * Server component: loads the full content through the same repo home/guides use
 * (Supabase → fixtures fallback), so the quiz preview computes over the real
 * corpus — not the ~5 committed fixtures, which would leave the preview empty
 * while home showed the real plan. The engine runs client-side once the person
 * finishes, so the preview reflects their localStorage profile.
 */
export default async function OnboardingPage() {
  const { steps } = await getContent();
  // ContentStep satisfies EngineStep; narrow to the fields the engine reads.
  const engineSteps: EngineStep[] = steps.map((s) => ({
    slug: s.slug,
    section_slug: s.section_slug,
    title: s.title,
    stage: s.stage,
    sort_order: s.sort_order,
    cond: s.cond,
    warn_rule: s.warn_rule,
  }));

  return <OnboardingFlow steps={engineSteps} />;
}
