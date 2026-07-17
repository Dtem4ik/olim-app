import type { Page } from "@playwright/test";

/**
 * Freeze entrance animations so axe samples the settled page, not a transient
 * fade frame. Mid-fade, muted text is partially transparent and blends with the
 * background into a lower-contrast colour (e.g. #646973 at ~0.76 opacity reads
 * as #888a8d on cream), tripping a false WCAG-contrast failure. `animation: none`
 * (not duration:0s, which leaves the element ambiguously on its first keyframe)
 * fully removes the animation so every element reverts to its base opacity:1
 * true colour; the double rAF lets that style recalc land before analyze().
 * The fade itself is untouched for real users.
 */
export async function settleAnimations(page: Page) {
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none !important;transition:none !important}",
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
