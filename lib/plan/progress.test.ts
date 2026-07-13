import { beforeEach, describe, expect, it } from "vitest";
import { loadProgress, PROGRESS_STORAGE_KEY, saveProgress, toggleInList } from "./progress";

describe("toggleInList", () => {
  it("adds a missing slug and removes a present one", () => {
    expect(toggleInList([], "a")).toEqual(["a"]);
    expect(toggleInList(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleInList(["a"], "b")).toEqual(["a", "b"]);
  });
});

describe("load/save progress", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips a versioned payload", () => {
    expect(loadProgress()).toEqual([]);
    saveProgress(["open-bank-account", "register-kupat-holim"]);
    expect(loadProgress()).toEqual(["open-bank-account", "register-kupat-holim"]);
  });

  it("ignores corrupt or wrong-version storage", () => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, "{bad");
    expect(loadProgress()).toEqual([]);
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ version: 99, done: ["x"] }));
    expect(loadProgress()).toEqual([]);
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ version: 1, done: [1, 2] }));
    expect(loadProgress()).toEqual([]);
  });
});
