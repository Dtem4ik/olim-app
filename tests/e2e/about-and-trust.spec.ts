import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { settleAnimations } from "./settle";

/**
 * Trust & safety surface (Phase 9b): the /about page is server-rendered and
 * indexable, and the not-legal-advice disclaimer sits on the step-card trust
 * footer (where deadlines/sums live), not only in the AI box.
 */

test.describe("/about", () => {
  test("is server-rendered & indexable (content present in raw HTML)", async ({ request }) => {
    const res = await request.get("/about");
    expect(res.status()).toBe(200);
    const html = await res.text();
    // Key content is in the SSR HTML (works with JS disabled, crawlable).
    expect(html).toContain("Olim");
    expect(html).toContain("mailto:d.tem4ik@gmail.com");
    expect(html).toContain("https://t.me/dtem4ik");
    expect(html).toContain("Kol Zchut");
    // Not excluded from indexing.
    expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+noindex/i);
  });

  test("renders the sections and feedback links, axe clean both themes", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /d\.tem4ik@gmail\.com/ })).toBeVisible();

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
  });
});

test.describe("step-card disclaimer", () => {
  const openFirstStep = async (page: Page) => {
    await page.goto("/guides/healthcare");
    await page.getByTestId("step-item").first().getByTestId("step-open").click();
  };

  test("the not-legal-advice note is on the step trust footer + in SSR HTML", async ({
    page,
    request,
  }) => {
    await openFirstStep(page);
    await expect(page.getByTestId("step-disclaimer")).toBeVisible();
    await expect(page.getByTestId("step-disclaimer")).toContainText(/юридическая консультация/i);

    // Opening the step deep-links the URL (redesign URL-sync); its SSR route
    // shares StepBody, so the disclaimer is in the server HTML (no-JS/crawlable).
    await expect(page).toHaveURL(/\/guides\/healthcare\/[a-z0-9-]+/i);
    const stepRes = await request.get(page.url());
    expect(stepRes.status()).toBe(200);
    expect(await stepRes.text()).toContain("не юридическая консультация");
  });
});
