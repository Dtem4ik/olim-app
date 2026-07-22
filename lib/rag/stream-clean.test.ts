import { describe, expect, it } from "vitest";
import { createStreamCleaner } from "./stream-clean";

/** Feed a full string through the cleaner in arbitrary chunks; return the display output. */
function run(chunks: string[]): string {
  const c = createStreamCleaner();
  let out = "";
  for (const ch of chunks) out += c.push(ch);
  out += c.end();
  return out;
}

describe("createStreamCleaner", () => {
  it("passes plain answer text straight through", () => {
    expect(run(["Открой ", "счёт ", "в банке."])).toBe("Открой счёт в банке.");
  });

  it("strips a trailing SOURCES line (newline-terminated)", () => {
    expect(run(["Ответ.\n", "SOURCES: open-bank-account\n"])).toBe("Ответ.\n");
  });

  it("strips a SOURCES line with no trailing newline", () => {
    expect(run(["Ответ.\nSOURCES: a, b"])).toBe("Ответ.\n");
  });

  it("suppresses a bare NO_ANSWER line entirely", () => {
    expect(run(["NO_ANSWER"])).toBe("");
    expect(run(["NO_ANSWER\n"])).toBe("");
  });

  it("does not leak a SOURCES line split across chunk boundaries", () => {
    expect(run(["Текст.\n", "SOUR", "CES: a, b"])).toBe("Текст.\n");
  });

  it("keeps multi-line answers intact", () => {
    expect(run(["Строка 1\n", "Строка 2\n", "SOURCES: a"])).toBe("Строка 1\nСтрока 2\n");
  });
});
