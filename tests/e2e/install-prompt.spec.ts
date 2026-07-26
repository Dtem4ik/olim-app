import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { settleAnimations } from "./settle";

/**
 * PWA install prompt (Phase 9a): Android mocks Chrome's `beforeinstallprompt`
 * and drives our sheet; iOS Safari branches to Share→Home-Screen instructions;
 * dismissal is remembered (never nags). axe both themes with the sheet open.
 */

const sheet = (page: Page) => page.getByTestId("install-sheet");

/** Dispatch a mocked beforeinstallprompt, retrying until the hydrated listener catches it. */
async function fireBeforeInstall(page: Page) {
  await expect(async () => {
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt") as Event & {
        prompt?: () => Promise<void>;
        userChoice?: Promise<{ outcome: string; platform: string }>;
      };
      const w = window as unknown as { __installPrompted?: boolean };
      e.prompt = () => {
        w.__installPrompted = true;
        return Promise.resolve();
      };
      e.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
      window.dispatchEvent(e);
    });
    await expect(sheet(page)).toBeVisible({ timeout: 600 });
  }).toPass({ timeout: 6000 });
}

test.describe("install prompt — Android (native event)", () => {
  test("auto-shows once; accept calls prompt() and it never nags after", async ({ page }) => {
    await page.goto("/");
    await fireBeforeInstall(page);

    // Native install CTA is present on the Android path.
    await page.getByTestId("install-accept").click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __installPrompted?: boolean }).__installPrompted,
        ),
      )
      .toBe(true);
    await expect(sheet(page)).toBeHidden();

    // Reload + re-fire: dismissal is remembered, so the sheet does NOT reappear.
    await page.reload();
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt");
      window.dispatchEvent(e);
    });
    await expect(sheet(page)).toBeHidden();
  });

  test("dismiss is remembered across reloads (never nags)", async ({ page }) => {
    await page.goto("/");
    await fireBeforeInstall(page);
    await page.getByTestId("install-dismiss").click();
    await expect(sheet(page)).toBeHidden();

    await page.reload();
    await page.evaluate(() => window.dispatchEvent(new Event("beforeinstallprompt")));
    await expect(sheet(page)).toBeHidden();
  });

  test("axe clean with the sheet open, both themes", async ({ page }) => {
    await page.goto("/");
    for (const theme of ["light", "dark"] as const) {
      await page.evaluate((t) => localStorage.setItem("theme", t), theme);
      await page.reload();
      await fireBeforeInstall(page);
      await settleAnimations(page);
      const results = await new AxeBuilder({ page })
        .include('[data-testid="install-sheet"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(serious, `axe (${theme}): ${JSON.stringify(serious, null, 2)}`).toEqual([]);
    }
  });
});

test.describe("install prompt — iOS Safari (instructions branch)", () => {
  test.use({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  });

  test("auto-shows illustrated Share→Home-Screen steps, no native CTA", async ({ page }) => {
    await page.goto("/");
    await expect(sheet(page)).toBeVisible();
    await expect(page.getByTestId("install-ios-steps")).toBeVisible();
    // iOS can't trigger install programmatically → no accept button.
    await expect(page.getByTestId("install-accept")).toHaveCount(0);

    await page.getByTestId("install-dismiss").click();
    await expect(sheet(page)).toBeHidden();
  });
});
