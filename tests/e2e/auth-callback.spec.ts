import { expect, test } from "@playwright/test";

/**
 * Auth callback route (Phase 9e) — code-path verification. Without valid Supabase
 * env in this environment the code exchange can't succeed, but the route's
 * error + open-redirect handling is exercised here; the happy path (land
 * signed-in → plan syncs) is the owner's live-site checklist item.
 */

test.describe("/auth/callback", () => {
  test("redirects to the profile error state when there is no code", async ({ request }) => {
    const res = await request.get("/auth/callback", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    expect(res.headers().location).toContain("/profile?auth_error=1");
  });

  test("never honors an external ?next (open-redirect guard)", async ({ request }) => {
    // Even with a (bogus) code, a malicious next must never send the user off-site.
    const res = await request.get("/auth/callback?code=bogus&next=https://evil.com", {
      maxRedirects: 0,
    });
    const location = res.headers().location ?? "";
    expect(location).not.toContain("evil.com");
    // Falls back to the profile (error path, since the bogus code can't exchange).
    expect(location).toContain("/profile");
  });
});
