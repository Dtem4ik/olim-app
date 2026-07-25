import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * OAuth / magic-link callback (Phase 7a). Supabase redirects here with a `?code`
 * after the user clicks the email link or returns from Google; we exchange it for
 * a session (cookies set via the server client's setAll) and bounce to the app.
 *
 * The localStorage plan is migrated into the account afterwards by SyncProvider /
 * `bootstrapSync` against `/api/state` on the next load — it reads the session
 * cookies set here, not the `?welcome` flag (which is just a landing marker).
 *
 * `next` is sanitized to a same-origin path (`safeNextPath`) to avoid an open
 * redirect.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}?welcome=1`);
      }
    }
  }
  return NextResponse.redirect(`${origin}/profile?auth_error=1`);
}
