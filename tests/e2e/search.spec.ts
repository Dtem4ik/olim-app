import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { settleAnimations } from "./settle";

async function expectNoSeriousA11yViolations(page: Page, prep?: (page: Page) => Promise<void>) {
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((t) => localStorage.setItem("theme", t), theme);
    await page.reload();
    await prep?.(page);
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

const box = (page: Page) => page.getByRole("searchbox");
const stepResult = (page: Page, text: string | RegExp) =>
  page.getByTestId("search-step-result").filter({ hasText: text });

test.describe("search", () => {
  test("empty state suggests sections", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByTestId("search-suggest-sections")).toBeVisible();
    // The search box takes focus on entry (touch + keyboard reachable).
    await expect(box(page)).toBeFocused();
  });

  test("exact word → tap-through to the raised step sheet, then query restores on back", async ({
    page,
  }) => {
    await page.goto("/search");
    await box(page).fill("банк");

    const result = stepResult(page, "Открыть счёт в банке").first();
    await expect(result).toBeVisible();
    // The URL mirrors the query so a back-nav can restore it.
    await expect(page).toHaveURL(/\/search\?q=/);

    await result.click();
    // Deep-links into the section with the step's sheet already raised (its own h1).
    await expect(page).toHaveURL(/\/guides\/banks-and-money\//);
    await expect(
      page.getByRole("heading", { level: 1, name: "Открыть счёт в банке" }),
    ).toBeVisible();

    // Back returns to search with the same query in the box (restore-on-back).
    await page.goBack();
    await expect(box(page)).toHaveValue("банк");
    await expect(stepResult(page, "Открыть счёт в банке").first()).toBeVisible();
  });

  test("typo is tolerated (болничную → больничную кассу)", async ({ page }) => {
    await page.goto("/search");
    await box(page).fill("болничную");
    await expect(stepResult(page, /больничную кассу/).first()).toBeVisible();
  });

  test("partial word matches (ульпан)", async ({ page }) => {
    await page.goto("/search");
    await box(page).fill("ульпан");
    await expect(stepResult(page, /ульпан/i).first()).toBeVisible();
  });

  test("no results for a nonsense query", async ({ page }) => {
    await page.goto("/search");
    await box(page).fill("zzzнетничегоxyz");
    await expect(page.getByText(/Ничего не найдено/i)).toBeVisible();
  });

  test("no serious a11y violations on search — empty and with results (both themes)", async ({
    page,
  }) => {
    await page.goto("/search");
    // Empty (section-suggestion) state.
    await expectNoSeriousA11yViolations(page);
    // Results state — retype after each reload the sweep performs.
    await expectNoSeriousA11yViolations(page, async (p) => {
      await box(p).fill("банк");
      await expect(stepResult(p, "Открыть счёт в банке").first()).toBeVisible();
    });
  });
});
