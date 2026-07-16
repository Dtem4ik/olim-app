"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Round header button that opens the search screen. */
export function SearchButton({ className }: { className?: string }) {
  const t = useTranslations("search");
  return (
    <Link
      href="/search"
      aria-label={t("title")}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border bg-surface text-surface-foreground transition-transform hover:bg-muted active:scale-90 focus-visible:outline-none",
        className,
      )}
    >
      <Search className="size-5" aria-hidden />
    </Link>
  );
}
