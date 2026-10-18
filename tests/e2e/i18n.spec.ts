import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { settleAnimations } from "./settle";

/**
 * English UI (`/en/...`). Russian keeps the unprefixed URLs; English is opt-in
 * via the profile language switcher and remembered in the NEXT_LOCALE cookie.
 * Guide content is still Russian-only, which the English UI says up front.
 */

/**
 * Let the service worker finish installing (precaching both locales' shells)
 * first: mid-install, the server is busy with those precache fetches and a
 * navigation can hit the SW's network timeout and fall back to a cached copy.
 */
async function waitForServiceWorkerControl(page: Page) {
  await page.waitForFunction(
    async () => {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg.active) && Boolean(navigator.serviceWorker.controller);
    },
    null,
    { timeout: 30_000 },
  );
}

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

test.describe("English UI", () => {
  test("/en renders the English interface", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(page.getByTestId("home-invite-cta")).toHaveText(/take the quiz/i);
  });

  test("an English browser still gets Russian by default (no Accept-Language redirect)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await context.close();
  });

  test("the profile switcher changes the language and the choice sticks", async ({ page }) => {
    await page.goto("/profile");
    await waitForServiceWorkerControl(page);
    await page.getByTestId("language-en").click();
    await expect(page).toHaveURL(/\/en\/profile$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("language-en")).toHaveAttribute("aria-current", "true");

    // Remembered: the unprefixed home now redirects to English.
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);

    // And back to Russian.
    await page.goto("/en/profile");
    await page.getByTestId("language-ru").click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
  });

  test("opening Profile in English keeps English (switcher prefetch can't reset it)", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL ?? "" }]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    // Client-side tab navigation renders the switcher with its `/ru/profile` link.
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link")
      .last()
      .click();
    await expect(page).toHaveURL(/\/en\/profile$/);
    // The network never idles here (SW precache, analytics). Give Next's
    // viewport prefetch time to fire — it used to request `/ru/profile` and the
    // proxy then rewrote the cookie to `ru`.
    await waitForServiceWorkerControl(page);
    await page.waitForTimeout(2_000);

    const cookie = (await context.cookies()).find((c) => c.name === "NEXT_LOCALE");
    expect(cookie?.value).toBe("en");
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
  });

  test("the SW precaches Russian pages in Russian even with an English preference", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL ?? "" }]);
    await page.goto("/en");
    await waitForServiceWorkerControl(page);

    const langs = await page.evaluate(async () => {
      const out: Record<string, string | undefined> = {};
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          const path = new URL(req.url).pathname;
          if (!["/", "/plan", "/offline", "/en/plan"].includes(path)) continue;
          const html = (await (await cache.match(req))?.text()) ?? "";
          out[path] = html.match(/<html lang="(\w+)"/)?.[1];
        }
      }
      return out;
    });
    expect(langs).toEqual({ "/": "ru", "/plan": "ru", "/offline": "ru", "/en/plan": "en" });
  });

  test("guides say their text is Russian-only and canonicalize to Russian", async ({ page }) => {
    await page.goto("/en/guides/healthcare");
    await expect(page.getByTestId("content-language-note")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/guides\/healthcare$/,
    );

    // The Russian page carries no such note.
    await page.goto("/guides/healthcare");
    await expect(page.getByTestId("content-language-note")).toHaveCount(0);
  });

  test("translated pages cross-reference each other with hreflang", async ({ page }) => {
    await page.goto("/en/plan");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/plan$/);
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute(
      "href",
      /\/plan$/,
    );
  });

  test("in-app links keep the /en prefix", async ({ page }) => {
    await page.goto("/en/guides");
    await page.getByTestId("sections-grid").getByRole("link").first().click();
    await expect(page).toHaveURL(/\/en\/guides\/[^/]+$/);
  });

  // The English offline-fallback branch itself (`/en/...` → `/en/offline`) is
  // unit-tested in lib/pwa/navigation-strategy.test.ts: Playwright's
  // `setOffline` doesn't reliably cut the SW's own fetches, so an uncached route
  // here can still reach the network (see AGENTS.md → offline trap).
  test("the precached English shell opens offline", async ({ page, context }) => {
    await page.goto("/en");
    await waitForServiceWorkerControl(page);

    await context.setOffline(true);
    // Precached English shell (never visited) opens offline, in English.
    await page.goto("/en/plan");
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await context.setOffline(false);
  });

  for (const route of ["/en", "/en/profile", "/en/onboarding"]) {
    test(`${route} has no serious accessibility violations in either theme`, async ({ page }) => {
      await page.goto(route);
      await expectNoSeriousA11yViolations(page);
    });
  }
});
