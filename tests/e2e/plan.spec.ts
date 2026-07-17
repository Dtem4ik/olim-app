import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { settleAnimations } from "./settle";

/** Seed a just-landed family profile so /plan renders a real tracker. */
async function seedProfile(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "olim.profile.v1",
      JSON.stringify({
        version: 1,
        stage: "just_landed",
        basis: "jewish",
        family: "with_children",
        pet: false,
        childrenAges: [7],
        monthsInCountry: 2,
        city: "Хайфа",
        arrivalDate: "2026-05-01",
      }),
    );
  });
}

async function expectNoSeriousA11yViolations(page: Page) {
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((t) => localStorage.setItem("theme", t), theme);
    await page.reload();
    await settleAnimations(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious, `axe (${theme}): ${JSON.stringify(serious, null, 2)}`).toEqual([]);
  }
}

test.describe("plan tracker", () => {
  test("filters narrow the plan; done filter reflects checked steps", async ({ page }) => {
    await seedProfile(page);
    await page.goto("/plan");

    // Default "all" shows the full plan with a progress readout.
    await expect(page.getByTestId("plan-progress")).toBeVisible();
    const allCount = await page.getByTestId("plan-step").count();
    expect(allCount).toBeGreaterThan(0);

    // "Done" is empty before anything is checked.
    await page.getByTestId("plan-filter-done").click();
    await expect(page.getByTestId("plan-empty")).toBeVisible();

    // Check the first step under "all", then it appears under "done".
    await page.getByTestId("plan-filter-all").click();
    const first = page.getByTestId("plan-step").first();
    const slug = await first.getAttribute("data-slug");
    await first.getByRole("checkbox").click();
    await page.getByTestId("plan-filter-done").click();
    await expect(page.locator(`[data-testid="plan-step"][data-slug="${slug}"]`)).toBeVisible();
    await expect(page.getByTestId("plan-step")).toHaveCount(1);

    // "Burning" is selectable and shows either steps or the empty note.
    await page.getByTestId("plan-filter-burning").click();
    await expect(page.getByTestId("plan-filter-burning")).toHaveAttribute("data-state", "active");
  });

  test("plan invites to the quiz without a profile", async ({ page }) => {
    await page.goto("/plan");
    await expect(page.getByTestId("plan-invite-cta")).toBeVisible();
  });

  test("share button is present once there is a plan", async ({ page }) => {
    await seedProfile(page);
    await page.goto("/plan");
    await expect(page.getByTestId("plan-share")).toBeVisible();
  });

  test("no serious a11y violations on the tracker (both themes)", async ({ page }) => {
    await seedProfile(page);
    await page.goto("/plan");
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe("shared plan page", () => {
  test("unknown slug returns 404", async ({ page }) => {
    const res = await page.goto("/plan/doesnotexist12345");
    expect(res?.status()).toBe(404);
  });

  // Full share round-trip needs a real Supabase stack (row insert + RPC read).
  // CI runs against the fixtures fallback (no DB), so gate this on an opt-in flag
  // set locally when `supabase start` is running (see the Phase 5 report).
  test("share creates a row and /plan/{slug} renders read-only", async ({ page, context }) => {
    test.skip(process.env.E2E_SUPABASE !== "1", "needs a local Supabase stack");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await seedProfile(page);
    await page.goto("/plan");

    // Check one step so the shared snapshot has a done-mark.
    const first = page.getByTestId("plan-step").first();
    const title = (await first.locator("a").textContent())?.trim();
    await first.getByRole("checkbox").click();

    await page.getByTestId("plan-share").click();
    // Desktop chromium has no navigator.share → clipboard fallback + "copied".
    await expect(page.getByText(/скопирована/i)).toBeVisible();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toMatch(/\/plan\/[A-Za-z0-9_-]{12,}$/);

    // The read-only page renders the plan with the done-mark and a CTA.
    await page.goto(new URL(url).pathname);
    await expect(page.getByTestId("shared-progress")).toBeVisible();
    await expect(page.getByTestId("shared-cta")).toBeVisible();
    if (title) await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    // No profile-only chrome (read-only): the tracker's share button is absent.
    await expect(page.getByTestId("plan-share")).toHaveCount(0);
  });
});
