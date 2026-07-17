import { type NextRequest, NextResponse } from "next/server";
import { searchContent } from "@/lib/search/search";

// A live query endpoint — never statically cached or prerendered.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchContent(q);
  // Short private cache so repeated keystrokes on the same term don't re-hit the
  // DB, without leaking a shared/CDN cache across users.
  return NextResponse.json(results, {
    headers: { "Cache-Control": "private, max-age=10" },
  });
}
