/**
 * Generate the PWA icon set (Phase 5c) from an inline SVG glyph — a monochrome
 * 4-point "navigator" sparkle on the brand indigo, matching the OG mark. Run
 * once and commit the PNGs: `pnpm tsx scripts/generate-icons.ts`.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const BRAND = "#4f66e0";
const OUT = join(process.cwd(), "public", "icons");

// 4-point sparkle centred in a 512 box; outer points near the edges.
const STAR = (r: number) => {
  const c = 256;
  const inner = r * 0.36;
  const d = inner / Math.SQRT2;
  return [
    `M${c} ${c - r}`,
    `L${c + d} ${c - d}`,
    `L${c + r} ${c}`,
    `L${c + d} ${c + d}`,
    `L${c} ${c + r}`,
    `L${c - d} ${c + d}`,
    `L${c - r} ${c}`,
    `L${c - d} ${c - d}`,
    "Z",
  ].join(" ");
};

/** Rounded-square badge for the `any` purpose (app launcher tiles). */
const rounded = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${BRAND}"/>
  <path d="${STAR(150)}" fill="#ffffff"/>
</svg>`;

/** Full-bleed with the glyph inside the maskable safe zone (~80% centre). */
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BRAND}"/>
  <path d="${STAR(118)}" fill="#ffffff"/>
</svg>`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const jobs: Array<[string, string, number]> = [
    ["icon-192.png", rounded, 192],
    ["icon-512.png", rounded, 512],
    ["icon-maskable-512.png", maskable, 512],
    ["apple-touch-icon.png", rounded, 180],
  ];
  for (const [name, svg, size] of jobs) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(OUT, name));
    console.log(`✓ ${name} (${size}×${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
