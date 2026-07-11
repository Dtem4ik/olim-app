/**
 * Shared target resolution for content scripts.
 *
 * SAFETY: the content import writes to the `public` schema with a service-role
 * key. The Supabase project is SHARED with the production portfolio site, so an
 * accidental write to the remote is a production incident. Therefore scripts
 * default to the LOCAL `supabase start` stack and REFUSE any non-local target
 * unless `--allow-remote` is passed explicitly (which also demands the neighbor
 * backup ritual — see AGENTS.md rules 6 & 7).
 */

import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface Target {
  url: string;
  serviceKey: string;
  isLocal: boolean;
}

function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0";
  } catch {
    return false;
  }
}

/** Read the local stack's API URL + service-role key from `supabase status`. */
function localTargetFromCli(): Target {
  let out: string;
  try {
    out = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  } catch {
    throw new Error(
      "Could not read `supabase status`. Start the local stack first: `pnpm db:start` " +
        "(Docker must be running).",
    );
  }
  const env = Object.fromEntries(
    out
      .split("\n")
      .map((line) => line.match(/^([A-Z0-9_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
  const url = env.API_URL;
  const serviceKey = env.SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("`supabase status` did not report API_URL / SERVICE_ROLE_KEY.");
  }
  return { url, serviceKey, isLocal: true };
}

/**
 * Resolve the write target. Priority:
 *   1. explicit `--url` + `--service-key` flags (or OLIM_IMPORT_URL /
 *      OLIM_IMPORT_SERVICE_KEY env),
 *   2. the local `supabase start` stack.
 * A non-local target aborts unless `allowRemote` is true.
 */
export function resolveTarget(opts: {
  url?: string;
  serviceKey?: string;
  allowRemote?: boolean;
}): Target {
  const url = opts.url ?? process.env.OLIM_IMPORT_URL;
  const serviceKey = opts.serviceKey ?? process.env.OLIM_IMPORT_SERVICE_KEY;

  const target: Target =
    url && serviceKey ? { url, serviceKey, isLocal: isLocalUrl(url) } : localTargetFromCli();

  if (!target.isLocal && !opts.allowRemote) {
    throw new Error(
      `Refusing to target a non-local Supabase (${target.url}).\n` +
        "This project shares its database with production. To write to the remote you must:\n" +
        "  1) take a fresh `pg_dump -n portfolio` backup (AGENTS.md rule 7),\n" +
        "  2) confirm the migration/objects touched, and\n" +
        "  3) re-run with --allow-remote.",
    );
  }
  return target;
}

export function createServiceClient(target: Target): SupabaseClient<Database> {
  return createClient<Database>(target.url, target.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
