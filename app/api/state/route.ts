import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  mergePlanState,
  parseAnswers,
  type ReminderLeadDays,
  type SyncState,
  syncBootstrapSchema,
  syncPushSchema,
} from "@/lib/sync/user-state";

// Reads the auth cookie → always dynamic, never cached.
export const dynamic = "force-dynamic";

const STATE_COLUMNS = "answers, done_step_ids, reminders_enabled, reminder_lead_days";

type StateRow = {
  answers: unknown;
  done_step_ids: unknown;
  reminders_enabled: boolean;
  reminder_lead_days: number;
};

function toSyncState(row: StateRow): SyncState {
  const done = Array.isArray(row.done_step_ids)
    ? row.done_step_ids.filter((s): s is string => typeof s === "string")
    : [];
  const lead = ([7, 14, 30] as const).includes(row.reminder_lead_days as ReminderLeadDays)
    ? (row.reminder_lead_days as ReminderLeadDays)
    : 14;
  return {
    answers: parseAnswers(row.answers),
    doneStepIds: done,
    remindersEnabled: row.reminders_enabled,
    reminderLeadDays: lead,
  };
}

/** Current signed-in user + their synced state (used by the Profile screen). */
export async function GET(): Promise<Response> {
  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.json({ signedIn: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false });

  const { data } = await supabase
    .from("user_state")
    .select(STATE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({
    signedIn: true,
    email: user.email ?? null,
    state: data ? toSyncState(data as StateRow) : null,
  });
}

/**
 * Bootstrap on (first) sign-in: merge the device's local plan into the account
 * (server answers win, done-steps unioned), claim this device's anonymous
 * share-plans, and return the merged state. Idempotent for returning users.
 */
export async function POST(request: Request): Promise<Response> {
  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.json({ signedIn: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false });

  const body = syncBootstrapSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { data: existing } = await supabase
    .from("user_state")
    .select(STATE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  const serverPlan = {
    answers: parseAnswers(existing?.answers),
    doneStepIds: Array.isArray(existing?.done_step_ids)
      ? (existing.done_step_ids as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
  };
  const merged = mergePlanState(serverPlan, {
    answers: body.data.answers,
    doneStepIds: body.data.doneStepIds,
  });

  const { data, error } = await supabase
    .from("user_state")
    .upsert(
      { user_id: user.id, answers: merged.answers ?? {}, done_step_ids: merged.doneStepIds },
      { onConflict: "user_id" },
    )
    .select(STATE_COLUMNS)
    .single();
  if (error || !data) return NextResponse.json({ error: "write-failed" }, { status: 500 });

  if (body.data.createdSlugs.length > 0) {
    await supabase.rpc("claim_plans", { p_slugs: body.data.createdSlugs });
  }

  return NextResponse.json({
    signedIn: true,
    email: user.email ?? null,
    state: toSyncState(data as StateRow),
  });
}

/** Write-through of ongoing local changes (signed-in only). */
export async function PUT(request: Request): Promise<Response> {
  const supabase = await getSupabaseServer();
  if (!supabase) return new NextResponse(null, { status: 401 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const body = syncPushSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { data, error } = await supabase
    .from("user_state")
    .upsert(
      { user_id: user.id, answers: body.data.answers ?? {}, done_step_ids: body.data.doneStepIds },
      { onConflict: "user_id" },
    )
    .select(STATE_COLUMNS)
    .single();
  if (error || !data) return NextResponse.json({ error: "write-failed" }, { status: 500 });
  return NextResponse.json({ ok: true, state: toSyncState(data as StateRow) });
}
