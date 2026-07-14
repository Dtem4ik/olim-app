import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

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

  test("no serious a11y violations on the tracker (both themes)", async ({ page }) => {
    await seedProfile(page);
    await page.goto("/plan");
    await expectNoSeriousA11yViolations(page);
  });
});
