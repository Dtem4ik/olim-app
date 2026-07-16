"use client";

import { BookOpen, Home, ListChecks, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BottomNav } from "@/components/bottom-nav";

/** Tabs that own a top-level destination, matched against the current pathname. */
const TABS = [
  { href: "/", key: "home", icon: Home },
  { href: "/plan", key: "plan", icon: ListChecks },
  { href: "/guides", key: "guides", icon: BookOpen },
  { href: "/profile", key: "profile", icon: User },
] as const;

/** Routes that are full-screen (no tab bar): onboarding, offline, dev, and the
 *  pushed step-detail screen (`/guides/[section]/[step]`, i.e. 2 path segments). */
function isHidden(pathname: string): boolean {
  if (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/offline") ||
    pathname.startsWith("/dev")
  ) {
    return true;
  }
  const guide = pathname.match(/^\/guides\/([^/]+)\/([^/]+)/);
  return guide !== null;
}

function activeHref(pathname: string): string {
  if (pathname === "/") return "/";
  const tab = TABS.find((t) => t.href !== "/" && pathname.startsWith(t.href));
  return tab?.href ?? "/";
}

/**
 * App-level bottom navigation, rendered once in the root layout so it is never
 * inside a transformed/animated container (which would break `position: fixed`).
 */
export function SiteBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  if (isHidden(pathname)) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      <BottomNav
        activeHref={activeHref(pathname)}
        className="pointer-events-auto"
        items={TABS.map((tab) => ({ href: tab.href, label: t(tab.key), icon: tab.icon }))}
      />
    </div>
  );
}
