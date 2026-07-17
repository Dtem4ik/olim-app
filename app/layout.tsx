import { SerwistProvider } from "@serwist/next/react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { SiteBottomNav } from "@/components/site-bottom-nav";
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
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: `${t("name")} — ${t("tagline")}`,
      template: `%s — ${t("name")}`,
    },
    description: t("tagline"),
    appleWebApp: { capable: true, statusBarStyle: "default", title: t("name") },
    icons: { apple: "/icons/apple-touch-icon.png" },
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
              {children}
              <SiteBottomNav />
            </NextIntlClientProvider>
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
