import { headers } from "next/headers";

/**
 * Best-effort client IP for coarse per-IP rate limiting (Phase 5). Reads the
 * proxy headers Vercel sets. Falls back to a constant bucket so an unknown IP
 * still shares one limiter rather than bypassing it entirely. Never for auth.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}
