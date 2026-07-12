import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { loadContentDir } from "@/lib/content/bundle";
import type { EngineStep } from "@/lib/plan/build-plan";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

/**
 * Server component: loads the committed fixture steps (real Supabase wiring is
 * Phase 4) and hands them to the client quiz. The engine runs client-side once
 * the person finishes, so the preview reflects their localStorage profile.
 */
export default function OnboardingPage() {
  const { bundle } = loadContentDir("content/fixtures");
  const steps: EngineStep[] = bundle.steps.map((s) => ({
    slug: s.slug,
    section_slug: s.section_slug,
    title: s.title,
    stage: s.stage ?? null,
    sort_order: s.sort_order,
    cond: s.cond,
    warn_rule: s.warn_rule ?? null,
  }));

  return <OnboardingFlow steps={steps} />;
}
