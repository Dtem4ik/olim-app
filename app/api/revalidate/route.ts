import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * On-demand revalidation (Phase 6b freshness). `content:import` POSTs here after a
 * successful import so newly imported/edited content goes live without a redeploy.
 * Guarded by a shared secret (`REVALIDATE_SECRET`). Revalidating the root layout
 * regenerates every nested content route (home, guides, sections, steps, sitemap)
 * on its next request.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const provided = req.headers.get("x-revalidate-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ revalidated: false, error: "unauthorized" }, { status: 401 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
