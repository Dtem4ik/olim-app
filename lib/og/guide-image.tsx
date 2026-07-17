import { ImageResponse } from "next/og";
import { loadInter } from "@/lib/og/font";

/**
 * Shared 1200×630 OG renderer for the SEO guide pages (Phase 6b) — reuses the
 * Phase 5 OG infra (`loadInter`, the rotated-square brand mark, the dark-token
 * palette). Step and section `opengraph-image` routes call this with their own
 * eyebrow/title/subtitle so a shared link unfurls with the right topic.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Palette mirrors the app's dark tokens (OG images have no CSS variables).
const BG = "#131620";
const FG = "#f4f4f5";
const MUTED = "#a1a1aa";
const PRIMARY = "#7c9cff";

export async function renderGuideOg(opts: {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  brand: string;
}): Promise<ImageResponse> {
  const [regular, bold] = await Promise.all([loadInter(400), loadInter(700)]);
  const fonts = [
    ...(regular
      ? [{ name: "Inter", data: regular, weight: 400 as const, style: "normal" as const }]
      : []),
    ...(bold
      ? [{ name: "Inter", data: bold, weight: 700 as const, style: "normal" as const }]
      : []),
  ];
  const fontOpts = fonts.length > 0 ? { fonts } : {};

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BG,
        color: FG,
        fontFamily: "Inter, sans-serif",
        padding: "72px 80px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 16,
            background: PRIMARY,
          }}
        >
          {/* Navigator sparkle drawn as a rotated square — no font glyph needed. */}
          <div
            style={{
              display: "flex",
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "#ffffff",
              transform: "rotate(45deg)",
            }}
          />
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>{opts.brand}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: PRIMARY }}>
          {opts.eyebrow}
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>
          {opts.title}
        </div>
        {opts.subtitle && (
          <div style={{ display: "flex", fontSize: 32, color: MUTED, lineHeight: 1.3 }}>
            {opts.subtitle}
          </div>
        )}
      </div>
    </div>,
    { ...OG_SIZE, ...fontOpts },
  );
}
