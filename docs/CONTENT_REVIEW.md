# Content review calendar — figures that go stale

Bureaucratic amounts in Israel are revised on a schedule. This file tells a future
content session **what to re-check and when**, so numbers a real person acts on
never quietly drift out of date. Every figure below also carries a
`last_verified_at` in the content; this doc is the "when to look again" companion.

> Rule of thumb: **minimum wage → April**, **Bituach Leumi / child benefits →
> January**. Re-verify each figure against its official `source_url`, update the
> value **and** `last_verified_at`, then `pnpm content:import`.

## Annually revised — put these on the calendar

| Figure | Revised | Where it lives in content | Current value (verified) |
|---|---|---|---|
| **Minimum wage** (monthly + hourly) | ~yearly, usually **April** | `minimum-wage` step body **and** summary (`work.json`); `benefits` rows `minimum-wage-monthly` / `minimum-wage-hourly` | 6 443,85 ₪/mo · 35,40 ₪/hr, since 2026-04-01 (2026-07-26) |
| **Child allowance** (kitzbat yeladim) | **January** (price-index linked) | `benefits` row `child-allowance-monthly` | 173 ₪ (1st) / 219 ₪ (2nd–4th) (2026-07-24) |
| **Child savings** (Hisachon le-kol yeled) | **January** | `benefits` row `child-savings-monthly` | 58 ₪/mo (2026-07-24) |
| **Osek patur turnover ceiling** | **January** | `benefits` row `osek-patur-turnover-ceiling` | 122 833 ₪/yr (2026-07-24) |
| **Sal klita (absorption basket) amounts** | **January** (Ministry publishes a new year's table) | `sal-klita-schedule` step body (`olim-benefits.json`) — working-age single / single-parent / couple rows inline | 21 694 / 35 071 / 41 359 ₪ total for 2026 (2026-10-07) |
| **Health-insurance exemption threshold** | Bituach Leumi, ~January | `health-insurance-exemption` step (`healthcare.json`) — narrated as "check the current threshold", no hard number | n/a (deferred to source by design) |

**Important — the minimum wage lives in TWO places** (the `minimum-wage` step
body/summary the user reads, and the `benefits` amount rows). Update BOTH each
April, or they drift apart. The step body is what users and the AI actually see;
the `benefits` rows are the structured record.

## Composition-dependent — no fixed figure by design

Do **not** invent a single number for these; they depend on household make-up.
Keep them deferring to the official calculator, and re-check that the calculator
URL still resolves.

| Item | Where | Handling |
|---|---|---|
| **Sal klita** (absorption basket) — first + monthly | `sal-klita-schedule` step (`olim-benefits.json`); `benefits` rows `sal-klita-first-payment` / `sal-klita-monthly` (`amount: null` by design) | Links to the Ministry of Aliyah entitlement calculator: https://www.gov.il/he/service/service_entitlement_calculator |

## Statutory deadlines — rarely change, but confirm on a big review

These are legal timeframes, not amounts; they move only on a law change. Spot-check
during the annual pass:

- Kupat holim registration window (90 days), driver's-licence exchange (1 year),
  health-insurance-fee exemption (up to 6 / 12 months), rent-assistance eligibility
  window (year 2 → end of year 5/6). All carry their own `source_url` +
  `last_verified_at`.

## How to re-verify

1. Open each figure's `source_url` (Kol Zchut / gov.il / btl.gov.il).
2. If the number changed, update the value **and** `last_verified_at` (and the
   `valid_from` where the content models an effective date, e.g. min wage).
3. `pnpm content:validate` → `pnpm content:import` (LOCAL), then push to the shared
   remote per the neighbour ritual (AGENTS.md rules 6 & 7).
4. If a min-wage / benefit fact feeds the AI eval set, re-run `pnpm eval`.
