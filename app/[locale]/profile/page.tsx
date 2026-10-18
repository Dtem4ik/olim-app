import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileView } from "@/components/profile/profile-view";
import { type LocaleParams, pageLocale } from "@/i18n/params";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  await pageLocale(params);
  const t = await getTranslations("profile");
  // Personal settings screen — no search value; keep it out of the index
  // (crawlable so the noindex is read, but never indexed).
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function ProfilePage({ params }: LocaleParams) {
  await pageLocale(params);
  return <ProfileView />;
}
