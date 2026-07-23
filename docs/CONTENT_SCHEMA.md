# Content schema

How Olim App content is authored, validated, and imported. The zod source of
truth is [`lib/content/schema.ts`](../lib/content/schema.ts); the loader/lint
live in [`lib/content/bundle.ts`](../lib/content/bundle.ts) and
[`lib/content/lint.ts`](../lib/content/lint.ts).

## Where content lives

- **Real content** lives in the **private `olim-content` repo** (the app repo is
  public). Clone it as a sibling directory: `../olim-content`. Its `content/*.json`
  files hold the production steps; it runs the same validator in its own CI.
- **Fixtures** — a small committed set under
  [`content/fixtures/`](../content/fixtures) (a handful of real steps) powers unit
  tests, e2e, and local dev without the private repo.

## File format

A **content bundle** is a JSON file with any of three top-level arrays. A
directory may hold many bundles; the loader reads every `*.json` (recursively),
validates each, and merges them. Unknown top-level keys are rejected.

```json
{
  "sections": [ /* Section */ ],
  "steps":    [ /* Step */ ],
  "benefits": [ /* Benefit */ ]
}
```

Split however is convenient (by section, by type…). Slugs are the identity used
for idempotent upserts, so they must be stable once published.

### Section

| Field | Type | Notes |
|---|---|---|
| `slug` | kebab-case, unique | identity; stable |
| `title` | string ≤120 | RU user-facing |
| `description` | string ≤400, optional | |
| `icon` | string, optional | Lucide icon name |
| `sort_order` | int ≥0, default 0 | section order on home |

### Step

| Field | Type | Notes |
|---|---|---|
| `slug` | kebab-case, unique | identity; stable |
| `section_slug` | kebab-case | must match an existing section |
| `title` | string ≤160 | |
| `summary` | string ≤400, optional | the "short answer first" |
| `body_md` | markdown 1–8000 | the steps themselves |
| `docs` | `Doc[]`, default `[]` | "bring with you" list |
| `warn_rule` | `WarnRule`, optional | deadline warning (below) |
| `tips` | `Tip[]`, default `[]` | community tips |
| `cond` | `Cond`, default `{}` | personalization (below) |
| `stage` | `Stage`, optional | lifecycle stage for ordering |
| `source_url` | https URL, allowlisted | **required, must be verified** |
| `last_verified_at` | `YYYY-MM-DD` | date you checked the source |
| `needs_review` | boolean, default `true` | flip to `false` after editing |
| `sort_order` | int ≥0, default 0 | order within the section |

`Doc` = `{ label: string≤200, note?: string≤400, required?: boolean }`
`Tip` = `{ text: string≤600, author?: string≤80 }`

### Benefit

Amount tables (sal klita, etc.). **Never inline amounts in step text** — link a
benefit instead. Dated versions coexist (unique per `slug` + `valid_from`).

| Field | Type | Notes |
|---|---|---|
| `slug` | kebab-case | identity together with `valid_from` |
| `title` | string ≤200 | |
| `amount` | number ≥0, nullable | leave `null` until verified |
| `currency` | 3-letter, default `ILS` | |
| `unit` | string, optional | `month`, `one-time`, … |
| `valid_from` | `YYYY-MM-DD` | when this amount takes effect |
| `valid_to` | `YYYY-MM-DD`, optional | must be ≥ `valid_from` |
| `source_url` | https URL, allowlisted | required |
| `last_verified_at` | `YYYY-MM-DD` | |
| `notes` | string ≤2000, optional | |
| `meta` | object, default `{}` | extra structured fields |

## `cond` — personalization condition language

A step is shown when **every** present key matches the person's answers; an
absent key means "no constraint". A value may be a single option or a list of
accepted options. Vocabularies are shared with the Phase 3 quiz.

| Key | Type | Values / meaning |
|---|---|---|
| `stage` | `Stage` \| `Stage[]` | `preparing`, `just_landed`, `first_months`, `settled` |
| `basis` | `Basis` \| `Basis[]` | `jewish`, `child_of_jew`, `grandchild_of_jew`, `spouse`, `returning_resident`, `returning_citizen`, `other` |
| `country` | slug \| slug[] | origin-country slug (e.g. `russia`, `ukraine`) |
| `family` | `Family` \| `Family[]` | `single`, `couple`, `with_children`, `single_parent` |
| `pet` | boolean | travelling with a pet |
| `children_ages` | `{ min?, max? }` | matches if a child falls in the range |
| `months_in_country` | `{ min?, max? }` | months since arrival |

A range needs at least one bound and `min ≤ max`. Example:

```json
"cond": { "stage": ["just_landed", "first_months"], "basis": "grandchild_of_jew", "children_ages": { "min": 0, "max": 6 } }
```

> `basis` splits `child_of_jew` vs `grandchild_of_jew` deliberately: a grandchild
> needs a two-generation archival paper trail and has different spouse rights and
> refusal risks — a major personalization fork.

## `warn_rule` — deadline warnings

Discriminated on `type`; `days` is the window length. The anchor date (flight,
arrival) comes from the user's plan at render time (Phase 3/4).

| `type` | Meaning |
|---|---|
| `expires_days` | expires N days after an anchor event |
| `deadline_before_flight_days` | must be done N days **before** the flight |
| `deadline_after_arrival_days` | must be done within N days **after** arrival |

```json
"warn_rule": { "type": "deadline_after_arrival_days", "days": 90, "label": "register with kupat holim" }
```

## Trusted source allowlist

Every `source_url` must be **https** and its host must equal or be a subdomain of
one of these (extend in `lib/content/lint.ts` when a new official source is
vetted):

- `gov.il` — Ministry of Aliyah and Integration, `health.gov.il`, …
- `btl.gov.il` — Bituach Leumi (National Insurance)
- `nativ.gov.il` — Nativ
- `kolzchut.org.il` — Kol Zchut (rights encyclopedia, has Russian)
- `jewishagency.org` — The Jewish Agency (Sochnut)

## Editorial lint rules

Beyond the schema, `content:validate` enforces:

- **allowlisted source** — untrusted host is an error.
- **no banned phrases** — no guarantees (`guarantee`, `гарант…`, `100% approval`)
  and no posing as legal advice. The product never promises outcomes and always
  points to the official source.
- **verification freshness** — `last_verified_at` must be a real date, not in the
  future; older than 365 days is a warning.

Tone (not machine-checked, but the bar): a friend who already went through it.
Short answer first, then "bring with you", then the steps. No officialese, no
guarantees, always "check the official source".

## Writing for the app's features (search · SEO · AI)

The content isn't just displayed — since Phases 6–8 the app **searches, indexes,
and answers questions from it**. A step written with these in mind works far
better. What each field feeds:

**Full-text search (Phase 6).** `search_steps` ranks by a weighted tsvector:
**title > summary > body**. So the words a person would actually type must appear,
especially in the title/summary. Include transliterated-Hebrew terms verbatim
(«купат холим», «рав-кав», «теудат зеут», «сал клита», «арнона», «ульпан») — the
Russian stemmer keeps them near-literal and trigram search covers typos, but only
if the term is written somewhere in the step.

**Programmatic SEO (Phase 6b).** Every step is a real SSR page (`/guides/[section]/[step]`)
with its own `<title>`/description/`<h1>` and JSON-LD. Structured data is parsed
**from the body**: if `body_md` genuinely lists **≥2 actions as a numbered/bulleted
list**, it emits a `HowTo` (and the `docs` "bring with you" become `HowToSupply`).
So write the steps as a clear ordered list, not one prose blob — it helps the
reader, the AI, and Google. `source_url` + `last_verified_at` render as the trust
footer, so keep them accurate and fresh.

**AI answer — "Спроси об Израиле" (Phase 8).** This is the strict one, because a
hallucinated deadline or sum can harm a real person:

- **Retrieval** embeds `title + summary + body` (Gemini, 768-dim). Clear,
  natural-language titles/summaries = the AI finds the right step. Computed at
  **import time** (needs `GEMINI_API_KEY`); re-import after editing so vectors refresh.
- **The AI answers ONLY from `body_md`, verbatim, or refuses.** It is forbidden to
  add anything not written in the step — no "free", "fast", "automatic", no invented
  number/date. Tested by the eval gate (`pnpm eval`). Practical consequences:
  - Want the AI to state a **deadline/rule** → write it explicitly in the body
    («записаться в течение **90 дней** после репатриации»). It won't infer it.
  - Don't write something you don't want quoted as fact — if the source says
    "reduced tariff", write that, not "free".
- **Amounts live in `benefits`, not in the body — and the AI does NOT read the
  benefits table.** So on "сколько платят по корзине абсорбции" the AI honestly says
  "зависит от состава семьи, см. официальный источник" instead of guessing a figure.
  That is the intended safe behaviour. Only put a figure in `body_md` if you truly
  want the AI to quote it (you then lose the dated-versioning that `benefits` gives).

**Checklist for a good step:** title + summary carry the real search terms
(incl. transliterated Hebrew) · body is a clear ordered list of concrete actions ·
every deadline/rule you want answerable is written verbatim in the body · amounts
stay in `benefits` · `source_url` allowlisted + `last_verified_at` fresh · no
guarantees. After importing new/edited steps, re-run `content:import` **with
`GEMINI_API_KEY` set** so the AI can retrieve them.

> When steps are added/renamed, update the app-side eval set
> (`evals/questions.json`) so its referenced slugs stay valid and new content is
> covered — otherwise `pnpm eval` reports "expected step not retrieved".

## Commands

```
pnpm content:validate       # schema + integrity + lint (CI gate). --dir to point elsewhere
pnpm content:import         # validate + upsert → LOCAL by default; also computes step embeddings when GEMINI_API_KEY is set (--skip-embeddings to opt out)
pnpm content:check-links    # fetch every source_url; report only, never fails
pnpm content:review-queue   # list steps still needs_review = true
```

`--dir ../olim-content/content` points any command at the private content repo.

### Safety: local by default

`content:import` and `content:review-queue` target the **local** `supabase start`
stack by default and **refuse a non-local target unless `--allow-remote`** is
passed — the Supabase project is shared with production (see AGENTS.md rules 6 &
7). Pushing content to the remote requires the neighbor backup ritual first.

### Link checker note

Some official sites (gov.il, kolzchut.org.il) return `403` to automated HEAD/GET
requests (bot protection). A `403` from these hosts means "reachable but blocks
bots", **not** a dead link — `content:check-links` reports it but never fails the
build. Verify such links by opening them in a browser.
