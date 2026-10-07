import { describe, expect, it } from "vitest";
import { classifyLink } from "./link-status";

describe("classifyLink", () => {
  it("treats 2xx/3xx as ok", () => {
    expect(classifyLink(200)).toBe("ok");
    expect(classifyLink(301)).toBe("ok");
  });

  it("treats bot-protection statuses as blocked, not broken", () => {
    for (const status of [401, 403, 429, 503]) expect(classifyLink(status)).toBe("blocked");
  });

  it("treats a Cloudflare challenge as blocked even on a 200", () => {
    expect(classifyLink(200, "challenge")).toBe("blocked");
  });

  it("treats missing pages and server errors as broken", () => {
    expect(classifyLink(404)).toBe("broken");
    expect(classifyLink(410)).toBe("broken");
    expect(classifyLink(500)).toBe("broken");
  });
});
