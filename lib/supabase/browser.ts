import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cookie-backed browser Supabase client (Phase 7 auth). Stores the session in
 * cookies (not localStorage) so server route handlers can read it, and refreshes
 * tokens on its own. Returns `null` when the env is not configured (CI/preview
 * before the remote is seeded) so the sign-in UI can hide gracefully.
 *
 * A module-level singleton: `createBrowserClient` is meant to be called once per
 * page so a single auth instance owns the refresh timer and onAuthStateChange.
 */
let client: SupabaseClient<Database> | null | undefined;

export function getSupabaseBrowser(): SupabaseClient<Database> | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key ? createBrowserClient<Database>(url, key) : null;
  return client;
}
