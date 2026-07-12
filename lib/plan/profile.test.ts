import { beforeEach, describe, expect, it } from "vitest";
import {
  clearProfile,
  hasChildren,
  isInCountry,
  loadProfile,
  PROFILE_STORAGE_KEY,
  type Profile,
  parseProfile,
  saveProfile,
} from "./profile";

const valid: Profile = {
  version: 1,
  stage: "just_landed",
  basis: "jewish",
  family: "with_children",
  pet: false,
  childrenAges: [3, 7],
  monthsInCountry: 1,
  city: "Хайфа",
  arrivalDate: "2026-07-01",
};

describe("hasChildren / isInCountry", () => {
  it("hasChildren", () => {
    expect(hasChildren("with_children")).toBe(true);
    expect(hasChildren("single_parent")).toBe(true);
    expect(hasChildren("single")).toBe(false);
    expect(hasChildren(undefined)).toBe(false);
  });
  it("isInCountry", () => {
    expect(isInCountry("just_landed")).toBe(true);
    expect(isInCountry("first_months")).toBe(true);
    expect(isInCountry("settled")).toBe(true);
    expect(isInCountry("preparing")).toBe(false);
    expect(isInCountry(undefined)).toBe(false);
  });
});

describe("parseProfile", () => {
  it("accepts a valid profile", () => {
    expect(parseProfile(valid)).toEqual(valid);
  });
  it("rejects a wrong version, unknown keys, and junk", () => {
    expect(parseProfile({ ...valid, version: 2 })).toBeNull();
    expect(parseProfile({ ...valid, extra: 1 })).toBeNull();
    expect(parseProfile(null)).toBeNull();
    expect(parseProfile("nope")).toBeNull();
  });
});

describe("localStorage round-trip", () => {
  beforeEach(() => window.localStorage.clear());

  it("saves and loads", () => {
    expect(loadProfile()).toBeNull();
    saveProfile(valid);
    expect(loadProfile()).toEqual(valid);
  });

  it("clears", () => {
    saveProfile(valid);
    clearProfile();
    expect(loadProfile()).toBeNull();
  });

  it("returns null on corrupt storage", () => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, "{not json");
    expect(loadProfile()).toBeNull();
  });

  it("returns null when the stored value fails validation", () => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ version: 1 }));
    expect(loadProfile()).toBeNull();
  });
});
