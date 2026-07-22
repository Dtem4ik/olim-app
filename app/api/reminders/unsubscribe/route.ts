import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Minimal RU page for the one-click unsubscribe (opened from an email). */
function page(message: string, status: number): Response {
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Напоминания Olim App</title></head><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#faf7ff;color:#1a1a2e;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0"><main style="max-width:28rem;padding:2rem;text-align:center"><h1 style="font-size:1.25rem;margin:0 0 .5rem">Olim App</h1><p style="color:#4b4b63;line-height:1.5">${message}</p></main></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

/**
 * One-click unsubscribe (Phase 7b) — NO login. The reminder email links here with
 * the user's unguessable `unsubscribe_token`; we flip reminders off via the
 * service role (the token isn't tied to a session).
 */
export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return page("Ссылка недействительна.", 400);

  const admin = getSupabaseAdmin();
  if (!admin) return page("Сервис временно недоступен.", 500);

  const { data, error } = await admin
    .from("user_state")
    .update({ reminders_enabled: false })
    .eq("unsubscribe_token", token)
    .select("user_id");
  if (error) return page("Не удалось обработать запрос. Попробуйте позже.", 500);
  if (!data || data.length === 0) return page("Ссылка недействительна или устарела.", 404);

  return page("Готово — напоминания о дедлайнах отключены. Эту страницу можно закрыть.", 200);
}
