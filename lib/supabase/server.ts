import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Cookie-backed server Supabase client (Phase 7 auth), for route handlers and
 * server components that act on behalf of a signed-in user. Reads the session
 * from request cookies and writes refreshed tokens back through `setAll`.
 *
 * `setAll` is wrapped in try/catch: in a Server Component cookies are read-only
 * (Next throws on write), which is fine — the browser client and the next route
 * handler keep the session fresh. In a Route Handler the writes take effect.
 *
 * Returns `null` when the env is not configured (CI/preview) so callers degrade.
 * Content/SEO routes never call this, so their ISR/static rendering is untouched.
 */
export async function getSupabaseServer(): Promise<SupabaseClient<Database> | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — cookies are read-only here.
        }
      },
    },
  });
}
