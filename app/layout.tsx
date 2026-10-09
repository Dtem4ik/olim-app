import { SerwistProvider } from "@serwist/next/react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { InstallPromptProvider } from "@/components/pwa/install-prompt-provider";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { SyncProvider } from "@/components/sync-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TopProgressBar } from "@/components/top-progress-bar";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  const siteUrl = getSiteUrl();
  // Keep only real Vercel preview/development deployments out of the index;
  // production is indexable, and local/CI (no VERCEL_ENV) stay indexable too so
  // Lighthouse SEO and e2e reflect the production behaviour.
  const isPreview =
    process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development";
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${t("name")} — ${t("tagline")}`,
      template: `%s — ${t("name")}`,
    },
    description: t("tagline"),
    applicationName: t("name"),
    authors: [{ name: t("name"), url: siteUrl }],
    creator: t("name"),
    publisher: t("name"),
    // Phone/address/email auto-linking mangles content and adds junk in unfurls.
    formatDetection: { telephone: false, address: false, email: false },
    // Default indexing directives; personal routes override with `noindex`.
    // The googleBot block unlocks large image previews + full snippets in rich
    // results (and Google's AI Overviews).
    robots: isPreview
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    // Site-wide OpenGraph defaults. Per-route `generateMetadata` adds
    // title/description/url/image; `siteName` + `locale` are inherited here so
    // every unfurl carries the brand without repeating it on each route.
    openGraph: { type: "website", siteName: t("name"), locale: "ru_RU" },
    appleWebApp: { capable: true, statusBarStyle: "default", title: t("name") },
    // Browser-tab favicon. app/favicon.ico is auto-injected by the file
    // convention (legacy/Safari); the SVG here serves modern browsers crisply
    // at any size. Both glyphs come from scripts/generate-icons.ts.
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: "/icons/apple-touch-icon.png",
    },
    // Search engine site verification (owner-provided) — renders
    // <meta name="google-site-verification" …> and <meta name="yandex-verification" …>.
    // Needed to submit the sitemap. Yandex can't use DNS: vercel.app isn't ours.
    verification: {
      google: "l6mQlxevNA1vL6kNy0KdODJbFWg-KtQ4IiYzs10gGD0",
      yandex: "1ee887c3734d069b",
    },
  };
}

export const viewport: Viewport = {
  // Browser UI (address bar) color. A meta tag needs a literal string — it cannot
  // read CSS variables — so these mirror the `--background` tokens by hand.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcf9" },
    { media: "(prefers-color-scheme: dark)", color: "#131620" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} min-h-dvh antialiased`}>
        <SerwistProvider swUrl="/sw.js">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider locale={locale} messages={messages}>
              <TopProgressBar />
              <AnalyticsProvider />
              <SyncProvider />
              <InstallPromptProvider>{children}</InstallPromptProvider>
              <SiteBottomNav />
            </NextIntlClientProvider>
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
