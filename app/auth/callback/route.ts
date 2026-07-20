import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * OAuth / magic-link callback (Phase 7a). Supabase redirects here with a `?code`
 * after the user clicks the email link or returns from Google; we exchange it for
 * a session (cookies set via the server client's setAll) and bounce to the app.
 *
 * `next` is sanitized to a same-origin path to avoid an open redirect.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/profile";

  if (code) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // ?synced=1 tells the Profile screen to run the first-sign-in migration.
        return NextResponse.redirect(`${origin}${next}?welcome=1`);
      }
    }
  }
  return NextResponse.redirect(`${origin}/profile?auth_error=1`);
}
