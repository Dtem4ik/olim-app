"use client";

import { BookOpen, Home, ListChecks, Search, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { BottomNav } from "@/components/bottom-nav";

/**
 * App-level bottom navigation. Lives in a client component because Lucide icon
 * components cannot cross the server/client boundary as props.
 */
export function SiteBottomNav({ activeHref = "/" }: { activeHref?: string }) {
  const t = useTranslations("nav");

  return (
    <BottomNav
      activeHref={activeHref}
      items={[
        { href: "/", label: t("home"), icon: Home },
        { href: "/plan", label: t("plan"), icon: ListChecks },
        { href: "/guides", label: t("guides"), icon: BookOpen },
        { href: "/search", label: t("search"), icon: Search },
        { href: "/profile", label: t("profile"), icon: User },
      ]}
    />
  );
}
