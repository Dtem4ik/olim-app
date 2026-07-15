import { cache } from "react";

/**
 * Load an Inter font binary (TTF) for `next/og` / satori, which cannot use the
 * woff2 that Google Fonts serves modern browsers. We request the CSS with a
 * legacy User-Agent so Google returns a `truetype` source, then fetch the file.
 * Returns null on any failure so the OG route can fall back to the default font
 * (Latin/number rendering stays fine; only Cyrillic would tofu). Cached per
 * render pass so the two weights aren't refetched.
 */
async function _loadInter(weight: 400 | 600 | 700): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`, {
      headers: {
        // A desktop UA old enough that Google serves TTF instead of woff2.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",
      },
    }).then((r) => r.text());
    const url = css.match(/src:\s*url\((.+?)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export const loadInter = cache(_loadInter);
