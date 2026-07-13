import { afterEach, describe, expect, it, vi } from "vitest";
import { capture } from "./analytics";

type Win = { posthog?: { capture: (e: string, p?: unknown) => void } };

afterEach(() => {
  (window as unknown as Win).posthog = undefined;
});

describe("capture", () => {
  it("is a no-op when PostHog is not initialized", () => {
    expect(() => capture("step_done", { slug: "x" })).not.toThrow();
  });

  it("forwards to window.posthog when present", () => {
    const spy = vi.fn();
    (window as unknown as Win).posthog = { capture: spy };
    capture("section_opened", { section: "banks-and-money" });
    expect(spy).toHaveBeenCalledWith("section_opened", { section: "banks-and-money" });
  });
});
