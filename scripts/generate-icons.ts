/**
 * Generate the PWA icon set (Phase 5c) from an inline SVG glyph — a monochrome
 * 4-point "navigator" sparkle on the brand indigo, matching the OG mark. Run
 * once and commit the assets: `pnpm tsx scripts/generate-icons.ts`.
 *
 * Emits both the PWA launcher icons in public/icons/ and the browser-tab
 * favicon via Next.js file conventions (app/icon.svg + app/favicon.ico), all
 * from the same glyph so the tab, launcher, and OG mark stay visually identical.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const BRAND = "#4f66e0";
const OUT = join(process.cwd(), "public", "icons");
const APP = join(process.cwd(), "app");

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

/** Assemble a multi-resolution .ico by embedding PNG frames (Vista+ format). */
async function buildIco(svg: string, sizes: number[]): Promise<Buffer> {
  const frames = await Promise.all(
    sizes.map(async (s) => ({
      s,
      png: await sharp(Buffer.from(svg)).resize(s, s).png().toBuffer(),
    })),
  );
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);
  const dir = Buffer.alloc(16 * frames.length);
  let offset = 6 + 16 * frames.length;
  frames.forEach((f, i) => {
    const o = i * 16;
    dir.writeUInt8(f.s >= 256 ? 0 : f.s, o); // width (0 = 256)
    dir.writeUInt8(f.s >= 256 ? 0 : f.s, o + 1); // height
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(f.png.length, o + 8); // bytes in resource
    dir.writeUInt32LE(offset, o + 12); // offset from file start
    offset += f.png.length;
  });
  return Buffer.concat([header, dir, ...frames.map((f) => f.png)]);
}

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

  // Browser-tab favicon via Next.js file conventions. The SVG serves modern
  // browsers crisply at any size and theme; favicon.ico covers legacy/Safari.
  writeFileSync(join(APP, "icon.svg"), `${rounded.trim()}\n`);
  console.log("✓ app/icon.svg");
  writeFileSync(join(APP, "favicon.ico"), await buildIco(rounded, [16, 32, 48]));
  console.log("✓ app/favicon.ico (16/32/48)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
