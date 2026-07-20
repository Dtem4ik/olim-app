import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  enabled: z.boolean(),
  leadDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
});

/** Update the signed-in user's reminder settings (Phase 7b). Owner-scoped. */
export async function PATCH(request: Request): Promise<Response> {
  const supabase = await getSupabaseServer();
  if (!supabase) return new NextResponse(null, { status: 401 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { error } = await supabase.from("user_state").upsert(
    {
      user_id: user.id,
      reminders_enabled: body.data.enabled,
      reminder_lead_days: body.data.leadDays,
    },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: "write-failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
