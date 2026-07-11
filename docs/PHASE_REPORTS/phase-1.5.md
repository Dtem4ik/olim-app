# Phase 1.5 — shadcn-first audit (remediation)

Status: **complete**. Scope: audit the Phase 1 UI kit against the shadcn registry
(a policy adopted after Phase 1 shipped) and align it where the registry fits.
No new features, no data layer, no Phase 2 work. Public component APIs and
`/dev/ui` are unchanged.

## 1. MCP setup

`.mcp.json` with the shadcn MCP server was already present and committed:

```json
{ "mcpServers": { "shadcn": { "command": "npx", "args": ["shadcn@latest", "mcp"] } } }
```

The shadcn MCP server was not connected as tools in this session, so the registry
was queried through the equivalent shadcn CLI (`pnpm dlx shadcn@latest search @shadcn …`
and `… view @shadcn/<name>`), which hits the same registry. The `AGENTS.md`
"UI policy: shadcn-first" and "MCP setup" sections were committed as part of this
phase.

## 2. Registry audit

Registry primitives evaluated (current registry incl. the newer additions): `empty`,
`input-group`, `field`, `item`, `badge`, `button-group`, `spinner`, `command`,
`navigation-menu`, `card`.

| Component | Registry candidate | Decision | Reason |
|---|---|---|---|
| `EmptyState` | `empty` (Empty/Header/Media/Title/Description/Content) | **Refactor** | Direct fit. Now composes `Empty`; `EmptyMedia variant="icon"` gives the muted icon chip; kept our rounded-xl dashed border and the icon/title/description/action API. |
| `SearchBar` | `input-group` (InputGroup/Input/Addon/Button) | **Refactor** | Direct fit for a controlled text input with a leading icon + clear affordance. `command` was rejected — it is a cmdk palette/combobox (list filtering), not a submit-style query field; that belongs to Phase 6 autocomplete, not here. |
| `ChecklistItem` | `field` + `checkbox` | **Refactor (partial)** | Composes `Field` content parts (`FieldContent`/`FieldTitle`/`FieldDescription`) + the Radix `Checkbox`. `FieldLabel`+`htmlFor` (the canonical Field checkbox pattern) was **not** used: it makes only the text clickable, which would shrink the tap target below 44px. We keep a wrapping `<label>` so the whole ≥44px row toggles the nested checkbox. |
| `DeadlineBadge` | `badge` | **Already aligned** | Already composes our extended `Badge` (`success`/`warning`/`destructive` variants). Domain logic (urgency → variant + icon + ICU label) lives in the component; the pure part is `lib/deadline.ts`. No change. |
| `StepCard` | `card` + `badge` (`item` considered) | **Already aligned** | Already composes `Card` + `Badge`. `Item` (row layout) was considered but is a lateral move, not an improvement, and `Card` is already a registry primitive. No change. |
| `SectionTile` | `badge` (`item`, `card` considered) | **Legitimately custom** | Composes `Badge`. A section tile is a 2-D card (icon+count on top, title/description below) inside a grid; the registry `Item` is a horizontal media/content/actions **row**, and `Card` is a non-interactive `<div>` (SectionTile must be a `Link`). No registry equivalent for the tile layout. |
| `BottomNav` | `navigation-menu`, `sidebar` (considered) | **Legitimately custom** | No registry primitive for a fixed mobile bottom tab bar. `navigation-menu` is a desktop Radix menubar; `sidebar` blocks are desktop chrome. Already token-based, `Link`-based, ≥44px tabs. |

## 3. What was refactored

- **New primitives installed** (via `shadcn add`, adapted to our tokens/rules):
  `empty`, `input-group`, `field`, and their deps `label`, `separator`, `textarea`.
  Our previously-adapted `button.tsx` / `input.tsx` were **not** overwritten.
- **`EmptyState`** now composes `Empty` (+ `asChild` added to `EmptyTitle` so the
  title stays a real `<h3>` heading — preserves the a11y contract the test asserts).
- **`SearchBar`** now composes `InputGroup` / `InputGroupInput` / `InputGroupAddon`
  / `InputGroupButton`; group bumped to `h-11`, `<search>` landmark + form-submit +
  i18n labels + `type="search"` preserved.
- **`ChecklistItem`** now composes `Field` content parts + `Checkbox`.
- **Primitive adaptations** (kept minimal, repo convention): `biome-ignore`
  comments for the intentional `role="group"` wrappers (`Field`, `InputGroup`,
  `InputGroupAddon`) and the focus-forwarding `onClick` in `InputGroupAddon`;
  `== 1` → `=== 1` and a keyed-list `biome-ignore` in the unused `FieldError`.
- **New dependency:** `radix-ui` (umbrella) — required by `field`/`label`/
  `separator` and reused by future shadcn primitives (dialog, select, popover in
  later phases). Reason stated per the "no new deps without a reason" rule.

Public props of all seven components are unchanged; `/dev/ui` renders them without
edits. Visual deltas are minor and within tokens (Empty icon chip 48→40px, title
16→18px; ChecklistItem label 16→14px via `FieldTitle`; SearchBar addon icon 20→16px,
clear button 36→32px). No structural change to the showcase.

## 4. Verification

All commands from repo root.

| Check | Command | Result |
|---|---|---|
| Lint/format | `pnpm lint` | ✅ clean (51 files) |
| Typecheck | `pnpm typecheck` | ✅ no errors |
| Unit + coverage | `pnpm test:coverage` | ✅ 26 tests / 8 files, **96.49%** stmts |
| Build | `pnpm build` | ✅ 4 static routes |
| E2E + axe | `pnpm e2e` | ✅ 8 tests (chromium + mobile), **0 serious/critical** axe in light & dark |
| Lighthouse | `pnpm lighthouse` | ✅ assertions pass, see below |

### Lighthouse (mobile emulation, median of 3)

| Page | Performance | Accessibility | Best Practices | SEO | Script transfer |
|---|---|---|---|---|---|
| `/` | **97** | **100** | 96 | 100 | 173 KB |
| `/dev/ui` | **96** | **100** | 96 | 100 | 183 KB |

Unchanged from Phase 1 (`/dev/ui` +1 KB from Label/Separator — the `radix-ui`
umbrella tree-shakes well). The Lighthouse JS assertion (200 KB regression guard)
still holds; Perf ≥90 / A11y ≥95 pass with margin.

## Known debts

1. Inherits Phase 1's JS-budget note (170 KB target vs ~163 KB framework floor);
   unchanged by this phase.
2. `radix-ui` umbrella added; first real consumers beyond `Field` arrive in later
   phases (quiz forms, dialogs). Bundle impact measured as negligible (+1 KB).
3. Screenshots not regenerated — no structural showcase change; deltas are the
   in-token pixel shifts listed above. Regenerate via the existing e2e flow if
   needed for the review.

## Deferred (out of scope, by design)

Everything in Phases 2–10. `command`/`combobox` (Phase 6 search autocomplete) was
explicitly deferred, not adopted for `SearchBar`.
