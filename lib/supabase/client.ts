import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Anonymous Supabase client for public reads (RLS: content tables are world
 * readable) and insert-only writes (step_reports). Returns `null` when the env
 * is not configured (local CI without a stack, or a preview before the remote is
 * seeded) so callers can fall back to the committed fixtures. No auth/cookies —
 * accounts arrive in Phase 7.
 */
export function getSupabaseAnon(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Either the legacy anon JWT or the new-style publishable key works with the
  // JS SDK; the Vercel ↔ Supabase integration provisions the publishable one.
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
