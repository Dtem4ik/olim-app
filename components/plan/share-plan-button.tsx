"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { sharePlan } from "@/app/plan/actions";
import { Button } from "@/components/ui/button";
import { capture } from "@/lib/analytics";
import type { Profile } from "@/lib/plan/profile";
import { recordCreatedShare } from "@/lib/share/created-shares";

type Status = "idle" | "sharing" | "copied" | "error";

/**
 * "Share my plan": creates an anonymous `plans` row via the server action, then
 * uses the Web Share API (mobile native sheet) with a clipboard fallback
 * (desktop). Emits the `plan_shared` analytics event on success.
 */
export function SharePlanButton({ answers, done }: { answers: Profile; done: string[] }) {
  const t = useTranslations("plan.share");
  const [status, setStatus] = useState<Status>("idle");

  async function onShare() {
    setStatus("sharing");
    const result = await sharePlan(answers, done);
    if (!result.ok) {
      setStatus("error");
      return;
    }

    const url = `${window.location.origin}/plan/${result.slug}`;
    // Remember this slug so it can be claimed by the account on first sign-in.
    recordCreatedShare(result.slug);
    capture("plan_shared", { slug: result.slug, done: done.length });

    // Prefer the native share sheet on mobile; fall back to the clipboard.
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t("shareTitle"), text: t("shareText"), url });
        setStatus("idle");
        return;
      } catch {
        // User dismissed the sheet, or share failed — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  const label = status === "sharing" ? t("sharing") : t("button");

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onShare}
        disabled={status === "sharing"}
        data-testid="plan-share"
      >
        <Share2 aria-hidden />
        {label}
      </Button>
      <p className="min-h-5 text-center text-sm text-muted-foreground" aria-live="polite">
        {status === "copied" && t("copied")}
        {status === "error" && t("error")}
      </p>
    </div>
  );
}
