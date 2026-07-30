import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileView } from "@/components/profile/profile-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  // Personal settings screen — no search value; keep it out of the index
  // (crawlable so the noindex is read, but never indexed).
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default function ProfilePage() {
  return <ProfileView />;
}
