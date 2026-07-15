import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Web app manifest (Phase 5c) — makes the app installable (A2HS). Localized
 * name/description via next-intl. Theme/background mirror the app's light
 * surface token; the browser UI adapts per-mode via the `themeColor` viewport in
 * the root layout. Icons are a simple monochrome glyph set in public/icons/.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("app");
  return {
    name: `${t("name")} — ${t("tagline")}`,
    short_name: t("name"),
    description: t("tagline"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdfcf9",
    theme_color: "#fdfcf9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
