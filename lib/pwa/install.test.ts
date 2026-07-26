import { describe, expect, it } from "vitest";
import {
  detectPlatform,
  INSTALL_DISMISSED_KEY,
  isStandalone,
  markDismissed,
  wasDismissed,
} from "./install";

function memStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

describe("detectPlatform", () => {
  it("classifies iPhone Safari as ios (needs manual Share instructions)", () => {
    expect(detectPlatform(IPHONE_SAFARI, 5)).toBe("ios");
  });

  it("does NOT classify iOS Chrome as ios (it can't install)", () => {
    expect(detectPlatform(IPHONE_CHROME, 5)).toBe("other");
  });

  it("classifies Android Chrome as android (native prompt path)", () => {
    expect(detectPlatform(ANDROID_CHROME, 5)).toBe("android");
  });

  it("treats touch-capable iPadOS (Mac UA) as ios", () => {
    expect(detectPlatform(MAC_SAFARI, 5)).toBe("ios");
  });

  it("treats a desktop Mac (no touch) as other", () => {
    expect(detectPlatform(MAC_SAFARI, 0)).toBe("other");
  });
});

describe("dismissal", () => {
  it("round-trips the versioned dismissal flag", () => {
    const s = memStorage();
    expect(wasDismissed(s)).toBe(false);
    markDismissed(s);
    expect(s.getItem(INSTALL_DISMISSED_KEY)).toBe("1");
    expect(wasDismissed(s)).toBe(true);
  });
});

describe("isStandalone", () => {
  it("is true under display-mode: standalone", () => {
    const win = { matchMedia: () => ({ matches: true }), navigator: {} } as unknown as Window;
    expect(isStandalone(win)).toBe(true);
  });

  it("is true under legacy iOS navigator.standalone", () => {
    const win = {
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true },
    } as unknown as Window;
    expect(isStandalone(win)).toBe(true);
  });

  it("is false in a normal browser tab", () => {
    const win = {
      matchMedia: () => ({ matches: false }),
      navigator: {},
    } as unknown as Window;
    expect(isStandalone(win)).toBe(false);
  });
});
