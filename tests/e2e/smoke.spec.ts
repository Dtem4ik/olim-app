import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { settleAnimations } from "./settle";

/** Fail only on the two most severe axe impact levels, in both themes. */
async function expectNoSeriousA11yViolations(page: Page) {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await settleAnimations(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious, `axe violations (${colorScheme}): ${JSON.stringify(serious, null, 2)}`).toEqual(
      [],
    );
  }
}

test.describe("home", () => {
  test("renders the personalized-home shell and invites to the quiz", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /навигаци/i })).toBeVisible();
    // Without a profile, home invites to the onboarding quiz.
    await expect(page.getByTestId("home-invite-cta")).toBeVisible();
  });

  test("has no serious accessibility violations in either theme", async ({ page }) => {
    await page.goto("/");
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe("dev/ui", () => {
  test("shows every component and is interactive", async ({ page }) => {
    await page.goto("/dev/ui");
    await expect(page.getByRole("heading", { name: "UI-кит v1" })).toBeVisible();

    // Checklist toggling works.
    const firstCheckbox = page.getByRole("checkbox").first();
    const wasChecked = await firstCheckbox.isChecked();
    await firstCheckbox.click();
    expect(await firstCheckbox.isChecked()).toBe(!wasChecked);

    // Search typing works.
    const search = page.getByRole("searchbox").first();
    await search.fill("банк");
    await expect(search).toHaveValue("банк");
  });

  test("has no serious accessibility violations in either theme", async ({ page }) => {
    await page.goto("/dev/ui");
    await expectNoSeriousA11yViolations(page);
  });
});
