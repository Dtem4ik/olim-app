import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/** Fail only on the two most severe axe impact levels, in both themes. */
async function expectNoSeriousA11yViolations(page: Page) {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
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

const next = (page: Page) => page.getByTestId("onboarding-next").click();
/** Exact-name radio selector (option labels can be substrings of one another). */
const radio = (page: Page, name: string) => page.getByRole("radio", { name, exact: true }).click();

/** Complete the quiz as a just-landed family with kids from Russia. */
async function completeAsFamilyJustLanded(page: Page) {
  await page.getByTestId("onboarding-start").click();
  await radio(page, "Только приземлился(лась)");
  await next(page);
  await radio(page, "Еврей(ка)");
  await next(page);
  await radio(page, "Россия");
  await next(page);
  await radio(page, "С детьми");
  await next(page);
  await page.getByTestId("onboarding-age-input").fill("7");
  await page.getByTestId("onboarding-age-add").click();
  await next(page);
  await radio(page, "Нет");
  await next(page);
  await page.getByTestId("onboarding-date").fill("2026-07-01");
  await next(page);
  await next(page); // city is optional → finish
}

test.describe("onboarding", () => {
  test("quiz builds a plan, persists on reload, and updates on edit", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByTestId("onboarding-intro")).toBeVisible();

    await completeAsFamilyJustLanded(page);

    // Plan preview reflects the answers.
    await expect(page.getByTestId("onboarding-preview")).toBeVisible();
    await expect(page.getByTestId("plan-step")).toHaveCount(4);
    await expect(page.getByText("Записаться в больничную кассу")).toBeVisible();
    // warn_rule (90 days after 2026-07-01 arrival) surfaces a deadline.
    await expect(page.getByText("2026-09-29")).toBeVisible();

    // Reload → profile persists, preview shows immediately (no intro).
    await page.reload();
    await expect(page.getByTestId("onboarding-preview")).toBeVisible();
    await expect(page.getByTestId("plan-step")).toHaveCount(4);

    // Edit answers → change the stage to "settled" → the plan changes.
    await page.getByTestId("onboarding-edit").click();
    await radio(page, "Уже обустраиваюсь");
    for (let i = 0; i < 10; i++) {
      if (await page.getByTestId("onboarding-preview").isVisible()) break;
      await next(page);
    }
    await expect(page.getByTestId("onboarding-preview")).toBeVisible();
    await expect(page.getByText("Записаться в ульпан")).toBeVisible();
    await expect(page.getByText("Записаться в больничную кассу")).toHaveCount(0);
  });

  test("has no serious accessibility violations across quiz screens (both themes)", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await expectNoSeriousA11yViolations(page); // intro

    await page.getByTestId("onboarding-start").click();
    await expect(page.getByRole("radiogroup")).toBeVisible();
    await expectNoSeriousA11yViolations(page); // a question screen (radio group)

    await radio(page, "Готовлюсь к репатриации");
    await next(page);
    await radio(page, "Внук(чка) еврея");
    await next(page);
    await radio(page, "Россия");
    await next(page);
    await radio(page, "Еду один(на)");
    await next(page);
    await radio(page, "Нет");
    await next(page); // pet → flight date (preparing)
    await next(page); // flight date optional → city
    await next(page); // city optional → finish

    await expect(page.getByTestId("onboarding-preview")).toBeVisible();
    await expectNoSeriousA11yViolations(page); // preview
  });
});
