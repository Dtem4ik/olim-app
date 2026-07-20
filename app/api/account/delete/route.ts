import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

// Reads the auth cookie + uses the service role → always dynamic.
export const dynamic = "force-dynamic";

/**
 * Delete the signed-in user's account (Phase 7a privacy). Verifies the caller
 * from their session, then hard-deletes the auth user via the admin API. That
 * cascades `user_state` (ON DELETE CASCADE) and disassociates any owned
 * share-plans (`plans.user_id` ON DELETE SET NULL — they hold no PII and stay
 * reachable only by their unguessable slug; see docs/PRIVACY.md). The device's
 * local cache is intentionally left intact (the app keeps working anonymously).
 */
export async function POST(): Promise<Response> {
  const supabase = await getSupabaseServer();
  if (!supabase) return new NextResponse(null, { status: 401 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "not-configured" }, { status: 500 });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "delete-failed" }, { status: 500 });

  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
