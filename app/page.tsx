import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export default async function HomePage() {
  const t = await getTranslations("home");
  const tApp = await getTranslations("app");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between px-4 pt-6">
        <span className="text-lg font-semibold tracking-tight">{tApp("name")}</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">{t("greeting")}</h1>
          <p className="text-base text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href="/dev/ui"
          prefetch={false}
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          {t("cta")}
          <ArrowRight />
        </Link>
        <p className="text-sm text-muted-foreground">{t("devHint")}</p>
      </main>

      <SiteBottomNav activeHref="/" />
    </div>
  );
}
