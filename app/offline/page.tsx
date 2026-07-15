import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offline");
  return { title: t("title"), robots: { index: false } };
}

/**
 * Offline fallback (Phase 5c). Served by the service worker for document
 * requests that aren't in any cache (see app/sw.ts → fallbacks). Static so it is
 * precached and always available with no network.
 */
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <WifiOff className="size-7" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-balance">{t("title")}</h1>
        <p className="text-muted-foreground text-pretty">{t("subtitle")}</p>
      </div>
      <Link href="/plan" className={buttonVariants({ size: "lg", className: "w-full" })}>
        {t("planCta")}
      </Link>
    </div>
  );
}
