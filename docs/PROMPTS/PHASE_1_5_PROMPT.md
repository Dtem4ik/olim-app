# Phase 1.5 kickoff prompt — shadcn-first audit (remediation, small scope)

Context: the shadcn-first UI policy (see "UI policy" in `AGENTS.md`) was adopted AFTER Phase 1 shipped. This mini-phase audits the existing UI kit against the shadcn registry and aligns it. This is NOT a redo of Phase 1 — public component APIs and `/dev/ui` stay, tests stay green.

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 1.5 (remediation) of the Olim App project. Read `AGENTS.md` (note the "UI policy: shadcn-first" and "MCP setup" sections), `docs/PHASE_REPORTS/phase-1.md`. Scope is ONLY what is listed here.

1. **MCP setup.** If `.mcp.json` with the shadcn MCP server is missing, run `pnpm dlx shadcn@latest mcp init --client claude`, verify the server responds, commit the config.

2. **Registry audit.** For EACH of the 7 custom components (`SectionTile`, `StepCard`, `ChecklistItem`, `DeadlineBadge`, `SearchBar`, `BottomNav`, `EmptyState`), query the shadcn registry via MCP and answer in writing: does the registry (including newer additions — Empty, Field, Item, Input Group, Button Group, Spinner, Command, Badge variants) provide this or its natural base?
   - Likely replacements to evaluate honestly: `EmptyState` → `Empty`; `SearchBar` → `Input Group` / `Command`; `ChecklistItem` → `Field` + `Checkbox`; `DeadlineBadge` → `Badge` variant.
   - Likely legitimately custom: `BottomNav`, `SectionTile`, `StepCard` — verify anyway.

3. **Align.** Where the registry fits, refactor the component to compose the registry primitive internally. Keep the external API (props) unchanged so nothing else breaks. Adapt to semantic tokens and ≥44px targets as before. Where it doesn't fit, document why in the audit table.

4. **Verify.** All existing tests, e2e + axe (both themes), Lighthouse budgets must stay green. Update `/dev/ui` if visuals changed.

Finish: `docs/PHASE_REPORTS/phase-1.5.md` — audit table (component → registry candidate → decision → reason), what was refactored, verification output. Update `docs/ARCHITECTURE.md` UI section if needed.

Do NOT touch anything else: no new features, no data layer, no Phase 2 work.
