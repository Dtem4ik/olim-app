import { describe, expect, it } from "vitest";
import { SENTRY_DENY_URLS, SENTRY_IGNORE_ERRORS } from "./sentry-filters";

const ignored = (message: string) =>
  SENTRY_IGNORE_ERRORS.some((p) => (typeof p === "string" ? message.includes(p) : p.test(message)));

describe("SENTRY_IGNORE_ERRORS", () => {
  it.each([
    "Failed to execute 'selectNode' on 'Range': the given Node has no parent.",
    "SecurityError: Failed to register a ServiceWorker for scope ('https://olimguide.online/') with script ('https://olimguide.online/sw.js'): The operation is insecure.",
    "AbortError: Failed to register a ServiceWorker for scope ('https://olimguide.online/') with script ('https://olimguide.online/sw.js'): Timed out.",
  ])("ignores %s", (message) => {
    expect(ignored(message)).toBe(true);
  });

  it("keeps real application errors", () => {
    expect(ignored("TypeError: Cannot read properties of undefined (reading 'steps')")).toBe(false);
  });
});

describe("SENTRY_DENY_URLS", () => {
  it("matches extension frames but not our own origin", () => {
    const denied = (url: string) => SENTRY_DENY_URLS.some((r) => r.test(url));
    expect(denied("chrome-extension://abc/content.js")).toBe(true);
    expect(denied("safari-web-extension://abc/content.js")).toBe(true);
    expect(denied("https://olimguide.online/_next/static/chunks/main.js")).toBe(false);
  });
});
