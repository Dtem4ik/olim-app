import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("disallows the internal showcase in every UI locale", () => {
    const [all] = [robots().rules].flat();
    expect(all?.userAgent).toBe("*");
    expect(all?.disallow).toEqual(["/api/", "/dev/", "/en/dev/"]);
  });
});
