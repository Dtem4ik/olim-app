import { HomeView } from "@/components/home/home-view";
import { getContent } from "@/lib/content/repo";

// ISR — home reflects new content within the hour, and immediately on
// content:import revalidation, without a redeploy (Phase 6b freshness).
export const revalidate = 3600;

/**
 * Personalized home. Content is read server-side (Supabase → fixtures fallback);
 * the personal plan is computed client-side from the localStorage profile.
 */
export default async function HomePage() {
  const { sections, steps } = await getContent();
  return <HomeView sections={sections} steps={steps} />;
}
