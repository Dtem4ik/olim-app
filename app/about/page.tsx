import { ArrowLeft, Mail, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { routeOpenGraph } from "@/lib/seo/open-graph";

/** Feedback channels (owner-provided). Change here if they move. */
const FEEDBACK_EMAIL = "d.tem4ik@gmail.com";
const FEEDBACK_TELEGRAM = "dtem4ik";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: { canonical: "/about" },
    openGraph: routeOpenGraph({
      url: "/about",
      title: t("title"),
      description: t("metaDescription"),
    }),
  };
}

/**
 * Static "about" page (Phase 9b) — what the app is, that it's free and
 * independent, the sources it draws from, the not-legal-advice note, and a
 * feedback contact. Fully server-rendered and indexable (no client JS), so it
 * works with JS disabled and earns search traffic (Kol Zchut / gov.il context).
 */
export default async function AboutPage() {
  const t = await getTranslations("about");
  const tNav = await getTranslations("nav");

  const sources = [t("sourceGov"), t("sourceKolzchut"), t("sourceBituach"), t("sourceNativ")];

  return (
    <article className="animate-page-enter mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-6 pb-28">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label={tNav("home")}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-surface text-surface-foreground transition-transform active:scale-90"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </header>

      <p className="text-balance text-muted-foreground">{t("lead")}</p>

      <Section title={t("independentTitle")}>
        <p>{t("independentBody")}</p>
      </Section>

      <Section title={t("sourcesTitle")}>
        <p>{t("sourcesBody")}</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {sources.map((s) => (
            <li key={s} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("disclaimerTitle")}>
        <p>{t("disclaimerBody")}</p>
      </Section>

      <Section title={t("feedbackTitle")}>
        <p>{t("feedbackBody")}</p>
        <div className="mt-3 flex flex-col gap-2">
          <a
            href={`mailto:${FEEDBACK_EMAIL}`}
            className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Mail className="size-4" aria-hidden />
            </span>
            <span>
              {t("feedbackEmail")} · <span className="text-muted-foreground">{FEEDBACK_EMAIL}</span>
            </span>
          </a>
          <a
            href={`https://t.me/${FEEDBACK_TELEGRAM}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Send className="size-4" aria-hidden />
            </span>
            <span>
              {t("feedbackTelegram")} ·{" "}
              <span className="text-muted-foreground">@{FEEDBACK_TELEGRAM}</span>
            </span>
          </a>
        </div>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h2>
      <div className="text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
