/**
 * Streaming display cleaner (Phase 8b) — pure, unit-tested.
 *
 * The model appends a machine-only `SOURCES: …` line and, when it can't answer,
 * emits the bare `NO_ANSWER` token. Neither should ever flash in the UI. This
 * line-buffered cleaner holds back the in-progress line until it is newline-
 * terminated, then suppresses SOURCES / NO_ANSWER lines while passing real
 * answer text straight through — so the answer still streams token-by-token.
 */

const SOURCES_RE = /^\s*SOURCES:/i;
const NO_ANSWER_RE = /^\s*NO_ANSWER\s*$/i;

function isControlLine(line: string): boolean {
  return SOURCES_RE.test(line) || NO_ANSWER_RE.test(line);
}

export interface StreamCleaner {
  /** Feed a raw delta; returns display-safe text to emit now (may be empty). */
  push(delta: string): string;
  /** Flush the final (un-terminated) line; returns display-safe remainder. */
  end(): string;
}

export function createStreamCleaner(): StreamCleaner {
  let pending = "";
  return {
    push(delta: string): string {
      pending += delta;
      let out = "";
      let nl = pending.indexOf("\n");
      while (nl !== -1) {
        const line = pending.slice(0, nl);
        out += isControlLine(line) ? "" : `${line}\n`;
        pending = pending.slice(nl + 1);
        nl = pending.indexOf("\n");
      }
      return out;
    },
    end(): string {
      const line = pending;
      pending = "";
      return isControlLine(line) ? "" : line;
    },
  };
}
