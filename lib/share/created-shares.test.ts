import { afterEach, describe, expect, it } from "vitest";
import { CREATED_SHARES_KEY, loadCreatedShares, recordCreatedShare } from "./created-shares";

afterEach(() => window.localStorage.clear());

describe("created-shares", () => {
  it("is empty by default", () => {
    expect(loadCreatedShares()).toEqual([]);
  });
  it("records and dedupes slugs", () => {
    recordCreatedShare("abcdefghijkl");
    recordCreatedShare("abcdefghijkl");
    recordCreatedShare("mnopqrstuvwx");
    expect(loadCreatedShares()).toEqual(["abcdefghijkl", "mnopqrstuvwx"]);
  });
  it("ignores corrupt storage", () => {
    window.localStorage.setItem(CREATED_SHARES_KEY, "{not json");
    expect(loadCreatedShares()).toEqual([]);
    window.localStorage.setItem(CREATED_SHARES_KEY, JSON.stringify([1, 2]));
    expect(loadCreatedShares()).toEqual([]);
  });
});
