import { describe, expect, it } from "vitest";
import type { Profile } from "@/lib/plan/profile";
import {
  mergePlanState,
  parseAnswers,
  syncBootstrapSchema,
  syncPushSchema,
  unionDone,
} from "./user-state";

const profile: Profile = {
  version: 1,
  stage: "just_landed",
  basis: "jewish",
  family: "single",
  pet: false,
};

describe("unionDone", () => {
  it("merges order-stable and deduped", () => {
    expect(unionDone(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });
  it("keeps the first list's order and appends new ones", () => {
    expect(unionDone(["x"], ["y", "x", "z"])).toEqual(["x", "y", "z"]);
  });
  it("handles empties", () => {
    expect(unionDone([], [])).toEqual([]);
    expect(unionDone(["a"], [])).toEqual(["a"]);
    expect(unionDone([], ["a"])).toEqual(["a"]);
  });
});

describe("parseAnswers", () => {
  it("parses a valid profile", () => {
    expect(parseAnswers(profile)).toEqual(profile);
  });
  it("returns null for empty/invalid blobs", () => {
    expect(parseAnswers({})).toBeNull();
    expect(parseAnswers(null)).toBeNull();
    expect(parseAnswers({ stage: "nope" })).toBeNull();
  });
});

describe("mergePlanState", () => {
  it("server answers win when present", () => {
    const server = { answers: profile, doneStepIds: ["a"] };
    const local = { answers: { ...profile, stage: "settled" as const }, doneStepIds: ["b"] };
    const merged = mergePlanState(server, local);
    expect(merged.answers?.stage).toBe("just_landed");
    expect(merged.doneStepIds).toEqual(["a", "b"]);
  });
  it("adopts local answers on first sign-in (no server row)", () => {
    const merged = mergePlanState(
      { answers: null, doneStepIds: [] },
      { answers: profile, doneStepIds: ["x"] },
    );
    expect(merged.answers).toEqual(profile);
    expect(merged.doneStepIds).toEqual(["x"]);
  });
  it("unions done-steps both ways", () => {
    const merged = mergePlanState(
      { answers: null, doneStepIds: ["a", "b"] },
      { answers: null, doneStepIds: ["b", "c"] },
    );
    expect(merged.doneStepIds).toEqual(["a", "b", "c"]);
  });
});

describe("wire schemas", () => {
  it("accepts a valid push body", () => {
    expect(syncPushSchema.safeParse({ answers: profile, doneStepIds: ["a"] }).success).toBe(true);
    expect(syncPushSchema.safeParse({ answers: null, doneStepIds: [] }).success).toBe(true);
  });
  it("rejects a malformed push body", () => {
    expect(syncPushSchema.safeParse({ answers: { stage: 1 }, doneStepIds: [] }).success).toBe(
      false,
    );
    expect(syncPushSchema.safeParse({ doneStepIds: "x" }).success).toBe(false);
  });
  it("defaults createdSlugs to [] in the bootstrap body", () => {
    const parsed = syncBootstrapSchema.safeParse({ answers: null, doneStepIds: [] });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.createdSlugs).toEqual([]);
  });
});
