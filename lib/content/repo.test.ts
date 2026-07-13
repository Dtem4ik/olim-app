import { beforeEach, describe, expect, it } from "vitest";
import { getContent } from "./repo";

beforeEach(() => {
  for (const k of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ])
    delete process.env[k];
});

describe("getContent", () => {
  it("falls back to the committed fixtures when Supabase is unconfigured", async () => {
    const content = await getContent();
    expect(content.source).toBe("fixtures");
    expect(content.sections.length).toBeGreaterThan(0);
    expect(content.steps.length).toBeGreaterThan(0);
    // Fixture steps carry no DB id and expose the fields screens need.
    const step = content.steps[0];
    expect(step?.id).toBeNull();
    expect(step?.body_md).toBeTypeOf("string");
    expect(Array.isArray(step?.docs)).toBe(true);
  });
});
