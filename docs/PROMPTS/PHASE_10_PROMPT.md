# Phase 10 kickoff prompt — MVP code closure + showcase (final code phase)

**Renumbering note (read this):** the original ROADMAP Phase 10 was "launch, growth, showcase". It is hereby redefined: the launch/growth half moved to `docs/LAUNCH_CHECKLIST.md` and belongs to the owner (soft launch, olim chats, Search Console — NOT this session's work). What remains in Phase 10 as engineering work: closing every outstanding code debt so the MVP is genuinely finished, plus the showcase deliverables (10c: README/architecture/case-study). Update `docs/ROADMAP.md` Phase 10 to reflect this split.

Goal: after this phase, "MVP is done by code" is a true statement. No new features beyond what is listed.

## THE ZERO-DEBT RULE (the owner's explicit requirement)

The owner will not share the app until there are **no open debts**. So this phase does not get to add new ones, and it must resolve the old ones explicitly. Concretely:

- Build a **debt ledger** in the report: walk the "Deferred / debts" section of EVERY phase report (5, 5.5, 6, 7, 8, 9) and give each item one of exactly two outcomes: **DONE** (with evidence), or **NOT-MVP** (with a one-line reason why it does not belong to a finished MVP, e.g. app stores cost $99/yr and need proven demand). No third category. Nothing vague, nothing "later".
- Anything you cannot finish must be raised to the owner IN CHAT during the session, not silently written into a debts list.
- The report ends with a table: item → outcome → evidence/reason. If every row is DONE or NOT-MVP, the MVP is closed.

## Scope realism (read before starting)

The A+B list below is large. If the A block consumes most of your usable context, **stop after A**, write the report for what is done, and say plainly that B needs a second session — the owner will run "Phase 10b" with the same prompt. Do NOT half-implement B items; a half-done polish item is a new debt, which is exactly what this phase exists to prevent.

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 10 (MVP code closure) of the Olim App project. Read `AGENTS.md` (hard rules 6–7, Known traps, docs-sweep), `docs/ROADMAP.md`, `docs/LAUNCH_CHECKLIST.md`, and the debts sections of `docs/PHASE_REPORTS/phase-5.md` … `phase-9.md`. Work STRICTLY on the items below, in the order given (A = must, B = should, C = only if A+B are done and gates hold).

Language policy: repository is English; chat in Russian; user-facing strings via next-intl dictionaries. Any remote migration follows the neighbor ritual (portfolio pg_dump snapshot + dry-run + object list + evidence in the report).

## A1 — Reminders working end-to-end (the last dead feature)

The reminder engine exists and was verified locally, but on prod nothing is scheduled, so the feature is dead. Close it in code, not in the dashboard:

- Schedule the daily run via an **additive migration** using `pg_cron` + `pg_net` (POST to the `send-reminders` function URL with the service key from Vault / a documented secret), so the schedule lives in the repo and is reproducible. If `pg_cron` is unavailable on the plan, fall back to a Vercel Cron route that invokes the function, and document why.
- The function needs `RESEND_API_KEY` as a Supabase secret — that is an OWNER step; make the code fail loudly-but-safely without it (already dry-runs) and write exact owner instructions in LAUNCH_CHECKLIST.
- **Custom SMTP note (blocked item):** Supabase refuses to edit the magic-link template without custom SMTP, so the RU sign-in email is impossible today and the built-in sender is rate-limited (a few per hour) — unusable past a handful of friends. Wire **Resend as the Auth SMTP provider**: document the exact dashboard steps + the RU template to paste (`supabase/templates/magic_link.html`), and state in the checklist that this unblocks both the RU email and real sending volume. Verify one real reminder email + one real magic-link email after the owner sets the key.

## A2 — Benefit amounts: no blanks in front of users

4 of 7 `benefits` rows have `amount: null` (sal-klita first + monthly, minimum wage monthly + hourly).

- **Minimum wage:** fill from the official source (Kol Zchut — note it rises every April; today's value is post-April 2026, so take the current number, not a cached article). Update the content in `../olim-content` and re-import.
- **Sal klita:** genuinely composition-dependent — keep `amount: null` BY DESIGN, but make the UI render the `notes` + a link to the ministry's entitlement calculator instead of an empty/zero amount. Verify no screen shows a blank, "null", or 0 ₪ anywhere.
- Add a `docs/CONTENT_REVIEW.md` note: which figures are annually revised (min wage — April; child allowance / benefits — January) so a future content session knows what to re-check.

## A3 — AI retrieval tuning (3 known eval misses)

`danger-min-wage`, `danger-tax-points`, `employee-rights` fail because the expected step fell out of top-k after the corpus tripled to 111 steps. Tune retrieval (RRF weights, k, query expansion / synonyms for transliterated and legal terms) until those three pass, WITHOUT regressing the rest. Re-run `pnpm eval`: target ≥95%, hard floor 90%, and 0 fabricated-source / 0 contradicted-fact. Commit the transcript.

## A4 — Turn the eval gate on in CI

The `evals` job is opt-in via `vars.RUN_AI_EVALS`. Enable it for PRs that touch `evals/`, `lib/rag/**`, `scripts/eval.ts` or content-schema files (path filter), so grounding can't silently regress, while sparing the Gemini free-tier RPD on unrelated PRs. Document the trigger.

## B1 — Quiz vocabulary gaps (real targeting holes)

Content exists that cannot be targeted: `old-age-allowance-olim` (no age/pension dimension) and pregnancy steps (targeted only via `family`). Add two dimensions to the shared vocabulary (`lib/content/schema.ts`), the quiz, the cond language and CONTENT_SCHEMA docs: an **age band / pension status** and an optional **pregnancy** flag (phrase it neutrally and make it skippable — it is sensitive). Update the condition engine tests (engine stays at 100%) and re-target the affected steps in `../olim-content`. Keep the quiz at ≤7 questions on screen — use conditional display, don't lengthen the flow for everyone.

## B2 — Sentry provable, PostHog replay confirmed

- Add a dev-only route or a documented one-liner that throws a test error so the owner can confirm Sentry actually receives events (production-safe: dev/preview only, never a public prod endpoint).
- Confirm session replay is actually recording with masking on (document how to check in the PostHog UI) and that the sample rate constant is the single lever.

## B3 — Housekeeping the reports keep listing

- Refresh `/dev/ui` so the showcase matches the redesigned components (it is dev-only but it is our design reference).
- Normalize the card-radius inconsistency across screens (one token, no ad-hoc values).
- Backfill per-photo Unsplash source URLs in `docs/IMAGES.md`.
- Re-check the `@tailwindcss/oxide` local dark-mode prod-build trap: if a patched version is out, bump it and remove the Known-trap workaround note; otherwise leave the note.

## B0 — One-variable domain swap (owner will attach a custom domain before launch)

The app currently lives on `olim-app.vercel.app`; a custom domain gets attached before the soft launch. Make that a 15-minute, one-variable change — not a hunt through the codebase:

- Audit every place a base URL is produced or assumed (canonical URLs, `sitemap.xml`, `robots.txt`, OG image routes, share links `/plan/{slug}`, auth callback, reminder email deep links, PWA manifest, JSON-LD). Route them all through a single source of truth (e.g. `NEXT_PUBLIC_SITE_URL` with a sane fallback to the Vercel URL), documented in `.env.example`.
- Note in LAUNCH_CHECKLIST the exact 3 owner steps for domain day: Vercel domain + env var, Supabase Auth URL Configuration, Resend sending domain (DNS records) — and that the product NAME ("Olim") does not change with the domain, so no renaming anywhere.
- If a `.space`/cheap-TLD is chosen, add a one-line caution in the checklist that deliverability for magic-link/reminder email is the reason to prefer `.com`/`.app` or to send from a subdomain of an established domain.

## B4 — Showcase (the surviving half of the original Phase 10c)

The repo is public and doubles as the owner's portfolio piece. Make it read that way:

- **README**: an accurate top section (what the product is, live link, feature list, stack), an architecture summary with a diagram or clear prose (data flow: private content repo → validator → import → Supabase → ISR pages; hybrid FTS+vector retrieval; anonymous-first accounts), and 3–4 mobile screenshots (home, step sheet, search/AI answer, plan).
- **`docs/CASE_STUDY.md`** (English): the "0 → product" story for a CV/interview — problem, why the phased AI-assisted workflow, key engineering decisions and trade-offs (grounded RAG with an eval gate, shared-DB neighbour ritual, per-route perf budgets, PII-masked replay), and measurable outcomes (test counts, eval score, Lighthouse numbers, corpus size).
- Keep it factual — no inflated claims, no "revolutionary".

## C — Decide, don't defer (no item may survive as a vague debt)

- **JS first-load / 280KB guard:** either trim (split next-intl messages per route, lazy zod on the quiz) with before/after numbers, OR formally close it as NOT-MVP with the reasoning that the user-facing gates (perf ≥90, a11y ≥95, LCP) pass with margin and byte count is an internal proxy. Pick one and record it in the ledger — do not leave it open.
- Same treatment for the `@tailwindcss/oxide` local dark-mode trap: patched → bump and delete the workaround note; not patched → NOT-MVP (local-only, CI is the gate) and keep the note. Either way it leaves the ledger.
- Anything you discover that genuinely blocks a finished MVP: raise it in chat, then implement it if the owner agrees.

## DoD

- A reminder email and a magic-link email both arrive on prod (after the owner sets the Resend key) — or, if the owner hasn't yet, the code+docs are complete and the only remaining step is pasting a key.
- No blank/zero amounts anywhere in the UI; min wage current; annual-review doc committed.
- `pnpm eval` ≥95% (floor 90), 0 fabricated / 0 contradicted, the 3 known misses fixed; eval job runs in CI on relevant paths.
- Quiz gains the two dimensions; engine coverage stays 100%; affected content re-targeted.
- All existing gates green: lint, typecheck, unit, e2e + axe both themes, Lighthouse per-route (perf/a11y/SEO), JS guard.
- Docs sweep: README status (MVP complete), ROADMAP marked done, LAUNCH_CHECKLIST updated with what is now code-complete vs owner-manual, ARCHITECTURE current.

Finish: `docs/PHASE_REPORTS/phase-10.md` — what was done / verification / ritual evidence / eval scores / before-after numbers where relevant, and the **debt ledger table** (every item from phases 5–9 → DONE or NOT-MVP with evidence/reason). End with an explicit status line:

- **"MVP code status: COMPLETE — zero open debts. Remaining items are owner-manual (keys/dashboards) or growth (launch, content cadence)."** — only if the ledger has no unresolved rows; list the owner-manual items separately so the owner sees exactly what is his.
- If anything is unresolved, say **"MVP code status: NOT complete"** and name precisely what remains and why. Do not claim completion optimistically — the owner is making a launch decision based on this line.
