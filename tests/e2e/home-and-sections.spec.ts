import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function expectNoSeriousA11yViolations(page: Page, prep?: (page: Page) => Promise<void>) {
  for (const theme of ["light", "dark"] as const) {
    // Drive the theme the way the app does — next-themes reads its localStorage
    // key at load and applies the class consistently, avoiding the token
    // inconsistency of flipping prefers-color-scheme mid-session.
    await page.evaluate((t) => localStorage.setItem("theme", t), theme);
    await page.reload();
    await prep?.(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious, `axe (${theme}): ${JSON.stringify(serious, null, 2)}`).toEqual([]);
  }
}

const radio = (page: Page, name: string) => page.getByRole("radio", { name, exact: true }).click();
const next = (page: Page) => page.getByTestId("onboarding-next").click();

/** Run the quiz as a just-landed family, leaving a profile in localStorage. */
async function takeQuiz(page: Page) {
  await page.goto("/onboarding");
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
  await page.getByTestId("onboarding-date").fill("2026-05-01");
  await next(page);
  await next(page); // city → finish
  await expect(page.getByTestId("onboarding-preview")).toBeVisible();
}

/** Seed a profile without walking the quiz (for the a11y sweep). */
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

test.describe("home & sections", () => {
  test("quiz → personalized home → section → progress persists everywhere", async ({ page }) => {
    await takeQuiz(page);

    // Personalized home.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Израиле/ })).toBeVisible();
    await expect(page.getByTestId("next-list")).toBeVisible();
    await expect(page.getByTestId("sections-grid")).toBeVisible();

    // Open the healthcare section and check a step.
    await page.goto("/guides/healthcare");
    const firstStep = page.getByTestId("step-item").first();
    const slug = await firstStep.getAttribute("data-slug");
    const check = firstStep.getByTestId("step-check");
    await expect(check).not.toBeChecked();
    await check.click();
    await expect(check).toBeChecked();

    // Persists on reload.
    await page.reload();
    await expect(page.getByTestId("step-item").first().getByTestId("step-check")).toBeChecked();

    // Same checked state on My plan (shared progress store).
    await page.goto("/plan");
    const planStep = page.locator(`[data-testid="plan-step"][data-slug="${slug}"]`);
    await expect(planStep.getByRole("checkbox")).toBeChecked();

    // "Outdated?" flow shows a thank-you.
    await page.goto("/guides/healthcare");
    const step = page.getByTestId("step-item").first();
    await step.getByRole("button").first().click(); // expand
    await step.getByTestId("report-open").click();
    await step.getByTestId("report-reason").fill("ссылка не открывается");
    await step.getByTestId("report-submit").click();
    await expect(step.getByTestId("report-thanks")).toBeVisible();
  });

  test("home invites to the quiz without a profile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("home-invite-cta")).toBeVisible();
  });

  test("no serious a11y violations on home, guides, section (both themes)", async ({ page }) => {
    await seedProfile(page);
    await page.goto("/");
    await expectNoSeriousA11yViolations(page);
    await page.goto("/guides");
    await expectNoSeriousA11yViolations(page);
    await page.goto("/guides/healthcare");
    await expectNoSeriousA11yViolations(page, async (p) => {
      await p.getByTestId("step-item").first().getByRole("button").first().click();
    });
  });
});
