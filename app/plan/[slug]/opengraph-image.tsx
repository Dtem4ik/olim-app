import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { loadInter } from "@/lib/og/font";
import { loadSharedPlan } from "@/lib/share/load-shared-plan";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Olim — план адаптации";

// Palette mirrors the app's dark tokens (OG images have no CSS variables).
const BG = "#131620";
const SURFACE = "#1b1f2b";
const FG = "#f4f4f5";
const MUTED = "#a1a1aa";
const PRIMARY = "#7c9cff";
const TRACK = "#2a2f3d";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [plan, t, tOnb, tApp, regular, bold] = await Promise.all([
    loadSharedPlan(slug),
    getTranslations("sharedPlan"),
    getTranslations("onboarding"),
    getTranslations("app"),
    loadInter(400),
    loadInter(700),
  ]);

  const fonts = [
    ...(regular
      ? [{ name: "Inter", data: regular, weight: 400 as const, style: "normal" as const }]
      : []),
    ...(bold
      ? [{ name: "Inter", data: bold, weight: 700 as const, style: "normal" as const }]
      : []),
  ];
  const fontOpts = fonts.length > 0 ? { fonts } : {};

  const pct = plan && plan.total > 0 ? Math.round((plan.doneCount / plan.total) * 100) : 0;
  const stageSummary = plan
    ? plan.groups
        .map((g) => (g.stage ? tOnb(`stages.${g.stage}`) : tOnb("preview.noStage")))
        .join("  ·  ")
    : "";

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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: PRIMARY,
              color: BG,
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            ✦
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>{tApp("name")}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: MUTED }}>{tApp("tagline")}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>
          {t("title")}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 120, fontWeight: 700, color: PRIMARY }}>
            {pct}%
          </div>
          {plan && (
            <div style={{ display: "flex", fontSize: 40, color: MUTED }}>
              {plan.doneCount} / {plan.total}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            height: 24,
            borderRadius: 999,
            background: TRACK,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", width: `${pct}%`, height: "100%", background: PRIMARY }} />
        </div>

        {stageSummary && (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: MUTED,
              background: SURFACE,
              borderRadius: 16,
              padding: "18px 24px",
            }}
          >
            {stageSummary}
          </div>
        )}
      </div>
    </div>,
    { ...size, ...fontOpts },
  );
}
