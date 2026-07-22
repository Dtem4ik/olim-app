// Deadline-reminder cron (Phase 7b). Runs on Deno / Supabase Edge Functions —
// NOT type-checked by the app's tsc/biome (excluded); its logic is mirrored and
// unit-tested by lib/reminders/compute.ts. Deployed + scheduled via cron.
//
// For each opted-in user it computes upcoming deadlines with the SHARED
// deadline-math (single source of truth, imported by relative path), claims each
// (user, step, lead) in reminder_log for idempotency, and — when RESEND_API_KEY
// is set — emails a RU reminder with a deep link + one-click unsubscribe.
// Without the key it runs as a dry-run (claims + reports, never sends).

import { createClient } from "npm:@supabase/supabase-js@2";
import { computeDueISO, daysUntil } from "../../../lib/plan/deadline-math.ts";

interface WarnRule {
  type: "expires_days" | "deadline_before_flight_days" | "deadline_after_arrival_days";
  days: number;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("REMINDER_FROM_EMAIL") ?? "Olim App <onboarding@resend.dev>";
const SITE_URL = (Deno.env.get("SITE_URL") ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function reminderEmail(title: string, days: number, stepUrl: string, unsubUrl: string): string {
  const whenLine =
    days === 0
      ? "Сегодня истекает срок."
      : `Через ${days} ${plural(days, "день", "дня", "дней")} истекает срок.`;
  return `<!doctype html><html lang="ru"><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a2e;line-height:1.5">
<p>${whenLine}</p>
<h2 style="margin:0 0 12px">${title}</h2>
<p style="margin:0 0 20px"><a href="${stepUrl}" style="display:inline-block;background:#6c5ce7;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">Что нужно сделать</a></p>
<p style="margin:24px 0 0;color:#6b6b80;font-size:12px">Не хотите такие письма? <a href="${unsubUrl}" style="color:#6b6b80">Отключить напоминания</a>.</p>
</body></html>`;
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false; // dry-run
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  return res.ok;
}

Deno.serve(async () => {
  const now = new Date();

  const [{ data: users }, { data: steps }] = await Promise.all([
    admin
      .from("user_state")
      .select("user_id, answers, done_step_ids, reminder_lead_days, unsubscribe_token")
      .eq("reminders_enabled", true),
    admin.from("steps").select("slug, title, section_slug, warn_rule").not("warn_rule", "is", null),
  ]);

  const withRules = (steps ?? []).filter((s) => s.warn_rule) as {
    slug: string;
    title: string;
    section_slug: string;
    warn_rule: WarnRule;
  }[];

  let sent = 0;
  let dryRun = 0;
  const report: { user: string; step: string; days: number; sent: boolean }[] = [];

  for (const u of users ?? []) {
    const answers = (u.answers ?? {}) as { flightDate?: string; arrivalDate?: string };
    const done = new Set((u.done_step_ids ?? []) as string[]);
    const lead = u.reminder_lead_days as number;

    for (const step of withRules) {
      if (done.has(step.slug)) continue;
      const dueISO = computeDueISO(step.warn_rule, answers);
      if (!dueISO) continue;
      const d = daysUntil(dueISO, now);
      if (d < 0 || d > lead) continue;

      // Claim (user, step, lead) — idempotent: a duplicate returns no row.
      const { data: claimed } = await admin
        .from("reminder_log")
        .upsert(
          { user_id: u.user_id, step_slug: step.slug, threshold_days: lead },
          { onConflict: "user_id,step_slug,threshold_days", ignoreDuplicates: true },
        )
        .select("id");
      if (!claimed || claimed.length === 0) continue; // already reminded

      const { data: authUser } = await admin.auth.admin.getUserById(u.user_id);
      const email = authUser.user?.email;
      const stepUrl = `${SITE_URL}/guides/${step.section_slug}/${step.slug}`;
      const unsubUrl = `${SITE_URL}/api/reminders/unsubscribe?token=${u.unsubscribe_token}`;
      const ok = email
        ? await sendEmail(
            email,
            `Скоро дедлайн: ${step.title}`,
            reminderEmail(step.title, d, stepUrl, unsubUrl),
          )
        : false;

      // If a real send was attempted and failed, release the claim so it retries.
      if (email && RESEND_API_KEY && !ok) {
        await admin
          .from("reminder_log")
          .delete()
          .eq("user_id", u.user_id)
          .eq("step_slug", step.slug)
          .eq("threshold_days", lead);
      } else if (ok) {
        sent++;
      } else {
        dryRun++;
      }
      report.push({ user: u.user_id, step: step.slug, days: d, sent: ok });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, dryRun, considered: report.length, report }),
    { headers: { "content-type": "application/json" } },
  );
});
