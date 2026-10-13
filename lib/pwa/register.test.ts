import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./register";

describe("registerServiceWorker", () => {
  it("resolves true when registration succeeds", async () => {
    const register = vi.fn().mockResolvedValue({});
    const warn = vi.fn();
    await expect(registerServiceWorker({ register }, warn)).resolves.toBe(true);
    expect(register).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ["SecurityError", "Failed to register a ServiceWorker: The operation is insecure."],
    ["AbortError", "Failed to register a ServiceWorker: Timed out while trying to start."],
  ])("swallows a %s rejection and warns instead of throwing", async (name, message) => {
    const error = new DOMException(message, name);
    const warn = vi.fn();
    await expect(
      registerServiceWorker({ register: () => Promise.reject(error) }, warn),
    ).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.any(String), error);
  });

  it("is a no-op without a Serwist instance (SW unsupported or disabled)", async () => {
    await expect(registerServiceWorker(null)).resolves.toBe(false);
  });
});
