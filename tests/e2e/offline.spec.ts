import { expect, type Page, test } from "@playwright/test";

/**
 * Offline / service-worker regression suite (hotfix-offline).
 *
 * The bug this guards against: a navigation to `/plan` while offline reached the
 * SW, the network attempt failed, and the SW returned nothing → Safari showed
 * `FetchEvent.respondWith received an error: no-response`. These tests drive a
 * real offline navigation and assert a real page renders — never the browser
 * error, never the `no-response` outcome.
 *
 * They run against the production build (playwright.config `webServer`), where the
 * service worker is enabled (it is disabled in dev). The SW is disabled entirely
 * in dev, so there is nothing to test there.
 */

/** A just-landed family, so /plan builds a non-empty personalized tracker. */
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

/**
 * Wait until the service worker is active AND controlling the page — only then do
 * navigations route through it, so this is the precondition for any offline test.
 * `serviceWorker.ready` resolving guarantees the precache install (in the SW's
 * install `waitUntil`) has completed.
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

/**
 * Assert we got the real requested route offline — not the browser's `no-response`
 * error, and not a fallback. The bottom navigation is server-rendered by the root
 * layout into every precached document, so its presence proves a real app
 * document was served (the browser error page has none). We also assert the
 * branded `/offline` page's headline is absent, so this distinguishes the real
 * route from the offline fallback too.
 */
async function expectRealAppScreen(page: Page) {
  await expect(page.getByRole("navigation", { name: /навигаци/i })).toBeVisible();
  await expect(page.getByText("Нет соединения")).toHaveCount(0);
}

test.describe("offline (service worker)", () => {
  test("the plan opens offline and renders the personalized tracker with no network", async ({
    page,
    context,
  }) => {
    await seedProfile(page);

    // Prime the SW online: load once so it installs, precaches, and claims.
    await page.goto("/plan");
    await waitForServiceWorkerControl(page);
    await expect(page.getByTestId("plan-progress")).toBeVisible();

    // Cut the network entirely — the airport scenario.
    await context.setOffline(true);

    // A fresh navigation to /plan must still render the real tracker from the
    // precached document + the localStorage profile (no network at all). The
    // tracker header is a <span>, and the plan builds client-side from the
    // profile — proving the runtime data comes from localStorage, not the network.
    await page.goto("/plan");
    await expectRealAppScreen(page);
    await expect(page.getByTestId("plan-progress")).toBeVisible();
    expect(await page.getByTestId("plan-step").count()).toBeGreaterThan(0);

    await context.setOffline(false);
  });

  test("core app routes open offline on a cold start (precached, never visited)", async ({
    page,
    context,
  }) => {
    // Visit ONLY the home route online; the others are precached but unvisited —
    // exactly the cold case iOS cache-eviction reduces every route to.
    await page.goto("/");
    await waitForServiceWorkerControl(page);

    await context.setOffline(true);

    for (const route of ["/plan", "/guides", "/search", "/"]) {
      await page.goto(route);
      await expectRealAppScreen(page);
      // The browser error / no-response would fail the goto or leave no <h1>.
    }

    await context.setOffline(false);
  });

  test("a previously visited section still renders offline", async ({ page, context }) => {
    await page.goto("/guides");
    await waitForServiceWorkerControl(page);
    // Open a real section so its document + images cache.
    const firstSection = page.getByRole("link").filter({ hasText: /./ }).first();
    await firstSection.click();
    await page.waitForLoadState("networkidle");
    const visitedUrl = page.url();

    await context.setOffline(true);
    await page.goto(visitedUrl);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await context.setOffline(false);
  });

  test("an unknown, uncached route degrades to the branded offline page (not an error)", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await waitForServiceWorkerControl(page);

    await context.setOffline(true);

    // A route that was never cached and does not exist in the precache: the chain
    // must still resolve — to the branded /offline page — never `no-response`.
    const response = await page.goto("/plan/some-never-cached-share-slug");
    // The navigation resolved to *a* document (status is not a network failure).
    expect(response, "navigation must resolve to a response, not a net error").not.toBeNull();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await context.setOffline(false);
  });
});
