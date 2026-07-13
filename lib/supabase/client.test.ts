import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseAnon } from "./client";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const PUB_KEY = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

afterEach(() => {
  for (const k of [URL_KEY, ANON_KEY, PUB_KEY]) delete process.env[k];
});

describe("getSupabaseAnon", () => {
  it("returns null without url/key", () => {
    expect(getSupabaseAnon()).toBeNull();
    process.env[URL_KEY] = "http://127.0.0.1:54321";
    expect(getSupabaseAnon()).toBeNull(); // url but no key
  });

  it("builds a client from anon or publishable key", () => {
    process.env[URL_KEY] = "http://127.0.0.1:54321";
    process.env[ANON_KEY] = "anon-jwt";
    expect(getSupabaseAnon()).not.toBeNull();
    delete process.env[ANON_KEY];
    process.env[PUB_KEY] = "sb_publishable_x";
    expect(getSupabaseAnon()).not.toBeNull();
  });
});
