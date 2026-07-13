import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlanView } from "@/components/plan/plan-view";
import { getContent } from "@/lib/content/repo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("plan") };
}

export default async function PlanPage() {
  const { steps } = await getContent();
  return <PlanView steps={steps} />;
}
