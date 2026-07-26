import { expect, type Page, test } from "@playwright/test";

/**
 * Analytics wiring sanity (Phase 9d): with no PostHog key in this environment we
 * stub `window.posthog` before load, so the env-gated facade
 * (`lib/analytics.ts#capture`) forwards to our collector. This proves the
 * launch-relevant events actually fire end-to-end — when the owner adds the key,
 * the same calls flow to PostHog.
 */

type Captured = { event: string; props?: Record<string, unknown> };

async function installCollector(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { posthog?: unknown; __events: Captured[] };
    w.__events = [];
    w.posthog = {
      capture: (event: string, props?: Record<string, unknown>) => {
        (window as unknown as { __events: Captured[] }).__events.push({ event, props });
      },
    };
  });
}

const events = (page: Page) =>
  page.evaluate(() => (window as unknown as { __events: Captured[] }).__events.map((e) => e.event));

const radio = (page: Page, name: string) => page.getByRole("radio", { name, exact: true }).click();
const next = (page: Page) => page.getByTestId("onboarding-next").click();

test.beforeEach(async ({ page }) => {
  await installCollector(page);
});

test("quiz_completed fires on finishing the onboarding quiz", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByTestId("onboarding-start").click();
  await radio(page, "Только приземлился(лась)");
  await next(page);
  await radio(page, "Еврей(ка)");
  await next(page);
  await radio(page, "Россия");
  await next(page);
  await radio(page, "Еду один(на)");
  await next(page);
  await radio(page, "Нет");
  await next(page);
  await next(page); // arrival date optional
  await next(page); // city optional → finish
  await expect(page.getByTestId("onboarding-preview")).toBeVisible();
  expect(await events(page)).toContain("quiz_completed");
});

test("step_done fires when checking a step", async ({ page }) => {
  await page.goto("/guides/healthcare");
  await page.getByTestId("step-item").first().getByTestId("step-check").click();
  await expect.poll(() => events(page)).toContain("step_done");
});

test("search_performed fires when searching", async ({ page }) => {
  await page.goto("/search");
  await page.getByRole("searchbox").fill("банк");
  await expect.poll(() => events(page)).toContain("search_performed");
});

test("report_outdated fires when reporting a step", async ({ page }) => {
  await page.goto("/guides/healthcare");
  await page.getByTestId("step-item").first().getByTestId("step-open").click();
  await page.getByTestId("report-open").click();
  await page.getByTestId("report-submit").click();
  await expect(page.getByTestId("report-thanks")).toBeVisible();
  expect(await events(page)).toContain("report_outdated");
});

test("install_prompt_shown + install_accepted fire on the Android install flow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(async () => {
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt") as Event & {
        prompt?: () => Promise<void>;
        userChoice?: Promise<{ outcome: string; platform: string }>;
      };
      e.prompt = () => Promise.resolve();
      e.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
      window.dispatchEvent(e);
    });
    await expect(page.getByTestId("install-sheet")).toBeVisible({ timeout: 600 });
  }).toPass({ timeout: 6000 });

  expect(await events(page)).toContain("install_prompt_shown");
  await page.getByTestId("install-accept").click();
  await expect.poll(() => events(page)).toContain("install_accepted");
});
