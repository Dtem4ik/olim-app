"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  /** href of the active item. */
  activeHref?: string;
  className?: string;
}

/** Fixed mobile tab bar. Each tab is a >=44px tap target. */
export function BottomNav({ items, activeHref, className }: BottomNavProps) {
  const t = useTranslations("nav");
  return (
    <nav
      aria-label={t("primary")}
      className={cn("flex items-stretch justify-around border-t bg-surface", className)}
    >
      {items.map((item) => {
        const isActive = item.href === activeHref;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-sm font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
