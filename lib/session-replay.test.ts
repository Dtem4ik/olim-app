import { describe, expect, it, vi } from "vitest";
import {
  decideReplaySampling,
  SESSION_RECORDING_CONFIG,
  SESSION_REPLAY_DECISION_KEY,
  SESSION_REPLAY_SAMPLE_RATE,
} from "./session-replay";

function memStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  };
}

describe("decideReplaySampling", () => {
  it("samples in when the dice is below the rate, and persists the decision", () => {
    const s = memStorage();
    expect(decideReplaySampling(s, () => 0.01)).toBe(true);
    expect(s.getItem(SESSION_REPLAY_DECISION_KEY)).toBe("1");
  });

  it("samples out when the dice is above the rate, and persists the decision", () => {
    const s = memStorage();
    expect(decideReplaySampling(s, () => 0.99)).toBe(false);
    expect(s.getItem(SESSION_REPLAY_DECISION_KEY)).toBe("0");
  });

  it("is sticky: a stored decision wins and the dice is not rolled again", () => {
    const s = memStorage({ [SESSION_REPLAY_DECISION_KEY]: "1" });
    const dice = vi.fn(() => 0.99);
    expect(decideReplaySampling(s, dice)).toBe(true);
    expect(dice).not.toHaveBeenCalled();
  });

  it("keeps the modest sample rate in the documented 10–20% band", () => {
    expect(SESSION_REPLAY_SAMPLE_RATE).toBeGreaterThanOrEqual(0.1);
    expect(SESSION_REPLAY_SAMPLE_RATE).toBeLessThanOrEqual(0.2);
  });

  it("masks all inputs so PII (city/dates/free-text) is never recorded", () => {
    expect(SESSION_RECORDING_CONFIG.maskAllInputs).toBe(true);
  });
});
