import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { type LocaleParams, pageLocale } from "@/i18n/params";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  await pageLocale(params);
  const t = await getTranslations("offline");
  return { title: t("title"), robots: { index: false } };
}

/**
 * Offline fallback (Phase 5c). Served by the service worker for document
 * requests that aren't in any cache (see app/sw.ts → fallbacks). Static so it is
 * precached and always available with no network.
 */
export default async function OfflinePage({ params }: LocaleParams) {
  await pageLocale(params);
  const t = await getTranslations("offline");
  return (
    <div className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md md:max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-sec-sky text-foreground">
        <WifiOff className="size-8" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-balance">{t("title")}</h1>
        <p className="text-muted-foreground text-pretty">{t("subtitle")}</p>
      </div>
      <Link href="/plan" className={buttonVariants({ size: "lg", className: "w-full" })}>
        {t("planCta")}
      </Link>
    </div>
  );
}
