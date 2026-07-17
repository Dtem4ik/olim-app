"use client";

import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Round button that shares a path via the Web Share API (clipboard fallback). */
export function ShareButton({
  path,
  title,
  className,
}: {
  path: string;
  title: string;
  className?: string;
}) {
  const t = useTranslations("step");
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? new URL(path, window.location.origin).href : path;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={t("share")}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border bg-surface text-surface-foreground transition-transform hover:bg-muted active:scale-90 focus-visible:outline-none",
        className,
      )}
    >
      {copied ? (
        <Check className="size-5 text-success" aria-hidden />
      ) : (
        <Share2 className="size-5" aria-hidden />
      )}
    </button>
  );
}
