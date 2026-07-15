/**
 * Resolve the site's absolute base URL for metadata / OG image URLs.
 *
 * Priority: an explicit `NEXT_PUBLIC_SITE_URL` (set it to the production domain),
 * then Vercel's per-deployment `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`,
 * then localhost for dev. Always returns an absolute origin with no trailing slash.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
