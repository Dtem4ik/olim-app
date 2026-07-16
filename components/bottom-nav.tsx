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

/** Floating pill tab bar. Each tab is a >=44px round tap target. */
export function BottomNav({ items, activeHref, className }: BottomNavProps) {
  const t = useTranslations("nav");
  return (
    <nav
      aria-label={t("primary")}
      className={cn(
        "flex items-center gap-1 rounded-full bg-nav-pill p-1.5 shadow-lg shadow-black/20",
        className,
      )}
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
              "flex size-12 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-pill-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-nav-pill",
              isActive
                ? "bg-nav-pill-foreground text-nav-pill"
                : "text-nav-pill-foreground/60 hover:text-nav-pill-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
