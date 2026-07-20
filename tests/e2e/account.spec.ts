import AxeBuilder from "@axe-core/playwright";
import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { settleAnimations } from "./settle";

/**
 * Phase 7a account e2e. Runs against the LOCAL Supabase stack (auth + Mailpit).
 * When auth is not configured (CI without the stack) the AccountPanel renders
 * nothing and the API is unreachable, so every test skips itself.
 *
 * Local well-known keys (safe only on localhost).
 */
const API = "http://127.0.0.1:54321";
const MAILPIT = "http://127.0.0.1:54324";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const PROFILE = {
  version: 1,
  stage: "just_landed",
  basis: "jewish",
  country: "russia",
  family: "single",
  pet: false,
};

function uniqueEmail(tag: string): string {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Current Mailpit message IDs addressed to `email`. */
async function messageIds(request: APIRequestContext, email: string): Promise<string[]> {
  const res = await request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  if (!res.ok()) return [];
  const { messages } = (await res.json()) as { messages: { ID: string }[] };
  return messages.map((m) => m.ID);
}

/** Extract the /auth/v1/verify link from a specific Mailpit message. */
async function linkFromMessage(request: APIRequestContext, id: string): Promise<string | null> {
  const msg = await (await request.get(`${MAILPIT}/api/v1/message/${id}`)).json();
  const body: string = msg.HTML || msg.Text || "";
  const match = body.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/i);
  return match?.[1] ? match[1].replace(/&amp;/g, "&") : null;
}

/**
 * Sign in through the Profile UI + click the emailed link (same browser ctx).
 * Magic links are single-use, so we wait for the message sent by THIS click
 * (an id not present before) — never a stale one from a prior sign-in.
 */
async function signIn(page: Page, request: APIRequestContext, email: string): Promise<void> {
  await page.goto("/profile");
  await expect(page.getByTestId("account-signin")).toBeVisible();
  await page.getByTestId("account-email-input").fill(email);

  // GoTrue rate-limits repeat OTPs to the same email (~1s); a second device
  // signing into the same account can hit it, so resend with backoff until the
  // fresh (unconsumed) link arrives.
  let link: string | null = null;
  for (let attempt = 0; attempt < 5 && !link; attempt++) {
    const before = await messageIds(request, email);
    await page.getByTestId("account-send-link").click();
    await expect(page.getByTestId("account-status")).not.toBeEmpty();
    for (let i = 0; i < 15 && !link; i++) {
      const fresh = (await messageIds(request, email)).filter((id) => !before.includes(id));
      if (fresh[0]) link = await linkFromMessage(request, fresh[0]);
      if (!link) await new Promise((r) => setTimeout(r, 300));
    }
    if (!link) await new Promise((r) => setTimeout(r, 1500));
  }
  if (!link) throw new Error(`no fresh magic link for ${email}`);

  await page.goto(link);
  await expect(page.getByTestId("account-email")).toHaveText(email, { timeout: 15_000 });
}

/** Skip the whole file when the local auth stack isn't reachable. */
test.beforeAll(async ({ request }) => {
  let reachable = false;
  try {
    reachable = (await request.get(`${MAILPIT}/api/v1/messages`)).ok();
  } catch {
    reachable = false;
  }
  test.skip(!reachable, "local Supabase auth stack not running");
});

test.describe("accounts", () => {
  test("anon plan migrates on sign-in, a second device sees it, sign-out keeps the local cache", async ({
    page,
    request,
    browser,
  }) => {
    const email = uniqueEmail("sync");

    // Device A: seed an anonymous profile + a checked step, then sign in.
    await page.goto("/");
    await page.evaluate((p) => {
      localStorage.setItem("olim.profile.v1", JSON.stringify(p));
      localStorage.setItem(
        "olim.progress.v1",
        JSON.stringify({ version: 1, done: ["open-bank-account"] }),
      );
    }, PROFILE);
    await signIn(page, request, email);

    // Device B: a fresh context (no localStorage). Signing into the same account
    // must surface the migrated profile — proof of cross-device sync.
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await signIn(pageB, request, email);
    await pageB.goto("/profile");
    await expect(pageB.getByTestId("profile-summary")).toBeVisible();
    await expect(pageB.getByTestId("profile-summary")).toContainText("Россия");

    // Sign out on B → the local cache is deliberately kept (offline still works).
    await pageB.getByTestId("account-signout").click();
    await expect(pageB.getByTestId("account-signin")).toBeVisible();
    await expect(pageB.getByTestId("profile-summary")).toBeVisible();
    await expect(pageB.getByTestId("profile-summary")).toContainText("Россия");

    await ctxB.close();
  });

  test("account deletion signs out and removes synced state", async ({ page, request }) => {
    const email = uniqueEmail("del");
    await page.goto("/");
    await page.evaluate((p) => localStorage.setItem("olim.profile.v1", JSON.stringify(p)), PROFILE);
    await signIn(page, request, email);

    await page.getByTestId("account-delete").click();
    await page.getByTestId("account-delete-confirm").click();
    // Back to the anonymous sign-in card; local plan is kept.
    await expect(page.getByTestId("account-signin")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("profile-summary")).toBeVisible();
  });

  test("reminder settings persist across reloads", async ({ page, request }) => {
    const email = uniqueEmail("rem");
    await signIn(page, request, email);

    await expect(page.getByTestId("reminders")).toBeVisible();
    await page.getByTestId("reminders-enable").click();
    await page.getByTestId("reminders-lead-7").click();
    await expect(page.getByTestId("reminders-lead-7")).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(page.getByTestId("reminders-enable")).toBeChecked();
    await expect(page.getByTestId("reminders-lead-7")).toHaveAttribute("aria-pressed", "true");
  });

  test("sign-in screen has no serious a11y violations (both themes)", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByTestId("account-signin")).toBeVisible();
    for (const theme of ["light", "dark"] as const) {
      await page.evaluate((t) => localStorage.setItem("theme", t), theme);
      await page.reload();
      await expect(page.getByTestId("account-signin")).toBeVisible();
      await settleAnimations(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(serious, `axe (${theme}): ${JSON.stringify(serious, null, 2)}`).toEqual([]);
    }
  });

  test("RLS denies reading another user's state (cross-user denial)", async ({ request }) => {
    // Two real users via the OTP verify flow.
    const a = await session(request, uniqueEmail("rls-a"));
    const b = await session(request, uniqueEmail("rls-b"));

    // A writes its own state (RLS allows own insert).
    const write = await request.post(`${API}/rest/v1/user_state`, {
      headers: authHeaders(a.accessToken),
      data: { user_id: a.userId, answers: PROFILE, done_step_ids: ["open-bank-account"] },
    });
    expect(write.ok()).toBeTruthy();

    // B tries to read A's row by id → RLS returns nothing.
    const bReadsA = await request.get(
      `${API}/rest/v1/user_state?select=user_id&user_id=eq.${a.userId}`,
      { headers: authHeaders(b.accessToken) },
    );
    expect(bReadsA.ok()).toBeTruthy();
    expect(await bReadsA.json()).toEqual([]);

    // B's own scoped read sees only B (here: nothing yet).
    const bReadsSelf = await request.get(`${API}/rest/v1/user_state?select=user_id`, {
      headers: authHeaders(b.accessToken),
    });
    expect(await bReadsSelf.json()).toEqual([]);

    // A can read its own row.
    const aReadsSelf = await request.get(`${API}/rest/v1/user_state?select=user_id`, {
      headers: authHeaders(a.accessToken),
    });
    expect((await aReadsSelf.json()).length).toBe(1);
  });
});

function authHeaders(token: string): Record<string, string> {
  return { apikey: ANON_KEY, Authorization: `Bearer ${token}`, "content-type": "application/json" };
}

/** OTP → Mailpit token_hash → verify → { accessToken, userId }. */
async function session(
  request: APIRequestContext,
  email: string,
): Promise<{ accessToken: string; userId: string }> {
  const otp = await request.post(`${API}/auth/v1/otp`, {
    headers: { apikey: ANON_KEY, "content-type": "application/json" },
    data: { email, create_user: true },
  });
  expect(otp.ok()).toBeTruthy();

  let tokenHash = "";
  for (let i = 0; i < 30 && !tokenHash; i++) {
    const res = await request.get(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const { messages } = (await res.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const msg = await (await request.get(`${MAILPIT}/api/v1/message/${messages[0]?.ID}`)).json();
      const body: string = msg.HTML || msg.Text || "";
      tokenHash = body.match(/token=([a-z0-9]+)/i)?.[1] ?? "";
    }
    if (!tokenHash) await new Promise((r) => setTimeout(r, 300));
  }
  expect(tokenHash, `no token for ${email}`).toBeTruthy();

  const verify = await request.post(`${API}/auth/v1/verify`, {
    headers: { apikey: ANON_KEY, "content-type": "application/json" },
    data: { type: "magiclink", token_hash: tokenHash },
  });
  expect(verify.ok()).toBeTruthy();
  const json = (await verify.json()) as { access_token: string; user: { id: string } };
  return { accessToken: json.access_token, userId: json.user.id };
}
