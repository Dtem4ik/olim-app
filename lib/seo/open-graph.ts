import type { Metadata } from "next";

/**
 * Brand shown as `og:site_name` / inherited into Twitter on every unfurl.
 * Identical across locales (mirrors messages `app.name`), so it's a constant to
 * avoid an async dictionary lookup in routes (section/step) that otherwise only
 * read content.
 */
export const OG_SITE_NAME = "Olim";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

/**
 * Build a route's OpenGraph object with the brand baked in.
 *
 * Next merges metadata shallowly by top-level key, so a page that sets
 * `openGraph` REPLACES the layout's entirely — `siteName`/`locale` do NOT
 * inherit. Every indexable route must therefore carry them itself; this keeps
 * that DRY and consistent. Images come from each route's file-convention
 * `opengraph-image`.
 */
export function routeOpenGraph(opts: {
  url: string;
  title: string;
  description?: string | undefined;
  type?: "website" | "article";
  /** Article facets (only used when type === "article"): freshness + taxonomy. */
  article?: {
    modifiedTime?: string | undefined;
    publishedTime?: string | undefined;
    section?: string | undefined;
    authors?: string[] | undefined;
  };
}): OpenGraph {
  const common = {
    siteName: OG_SITE_NAME,
    locale: "ru_RU",
    url: opts.url,
    title: opts.title,
    ...(opts.description !== undefined ? { description: opts.description } : {}),
  };
  if (opts.type === "article") {
    const a = opts.article ?? {};
    return {
      type: "article",
      ...common,
      ...(a.publishedTime ? { publishedTime: a.publishedTime } : {}),
      ...(a.modifiedTime ? { modifiedTime: a.modifiedTime } : {}),
      ...(a.section ? { section: a.section } : {}),
      ...(a.authors ? { authors: a.authors } : {}),
    };
  }
  return { type: "website", ...common };
}
