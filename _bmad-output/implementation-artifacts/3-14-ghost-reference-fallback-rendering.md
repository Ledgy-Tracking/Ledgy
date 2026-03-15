# Story 3.14: Ghost Reference Fallback Rendering

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user linking records across ledgers,
I want deleted reference targets to render as "ghost" (disabled, struck-through) instead of crashing the UI,
so that I can see which entries once linked to records that no longer exist, and understand the relationship history without losing data integrity.

## Acceptance Criteria

1. **Ghost detection on render** — When rendering a relation field cell, if the target entry ID exists in `deletedEntryIds` memoized set, mark it as ghost before rendering.

2. **RelationTagChip receives isGhost flag** — The `RelationTagChip` component already accepts an `isGhost` prop; pass `true` when target is deleted.

3. **Visual styling for ghosts** — Ghost references render with:
   - Zinc-800 background + zinc-700 border (disabled appearance)
   - Zinc-500 text color (muted, not emerald-400)
   - Line-through text decoration
   - `cursor-not-allowed` mouse cursor
   - NO external link icon (disabled state)

4. **No crash on deleted target** — Relation rendering gracefully handles missing targets without throwing errors or leaving blank cells.

5. **Navigation prevented on ghost** — Clicking a ghost reference does nothing (disabled button); no navigation attempt, no error logs.

6. **Bulk selection includes ghosts** — Ghost references remain selectable via checkbox in bulk-edit mode; they do not bypass the selection UI.

7. **Ghost rendering in InlineEntryRow** — When editing/creating entries, relation fields with deleted targets show ghosts correctly in the combobox or inline edit context.

8. **Ghost rendering in BackLinksPanel** — If a backlink source entry is soft-deleted, it should appear as "ghost" or excluded from the BackLinksPanel display to avoid confusing deleted entries as active references.

9. **Schema-aware ghost detection** — Ghosts are only checked for relation field types; non-relation fields ignore the deleted state.

10. **No console warnings** — Ghost detection and rendering do not emit spurious warnings or errors.

## Tasks / Subtasks

- [ ] Task 1 — Audit current ghost detection and RelationTagChip integration
  - [ ] 1.1 Verify `deletedEntryIds` memoized set is correctly populated in LedgerTable (line 58-72)
  - [ ] 1.2 Confirm RelationTagChip component accepts and respects `isGhost` prop
  - [ ] 1.3 Check that all relation rendering code paths pass `isGhost` flag

- [ ] Task 2 — Ensure ghost flag is passed at all rendering touchpoints
  - [ ] 2.1 Update LedgerTable cell rendering logic to pass `isGhost={deletedEntryIds.has(val)}` to RelationTagChip
  - [ ] 2.2 Update InlineEntryRow's RelationCombobox rendering to highlight/disable ghost targets
  - [ ] 2.3 Verify BackLinksPanel filters or marks soft-deleted entries (if they appear in backlinks)
  - [ ] 2.4 Test edge case: relation field with empty/null value vs. deleted target

- [ ] Task 3 — Validate ghost UI styling and interaction
  - [ ] 3.1 Test visual appearance in dark mode: line-through, zinc-500 text, zinc-800/700 borders
  - [ ] 3.2 Confirm ghost buttons are disabled and cursor shows `not-allowed`
  - [ ] 3.3 Verify no navigation occurs on ghost click
  - [ ] 3.4 Confirm bulk selection checkboxes work on ghosts (they remain selectable)

- [ ] Task 4 — Test edge cases and error resilience
  - [ ] 4.1 Create entry with relation → soft-delete target → verify cell shows ghost on re-render
  - [ ] 4.2 Test ghost rendering with multi-relation fields (multiple ghosts in one cell)
  - [ ] 4.3 Verify no crashes or console errors when rendering large datasets with many ghosts
  - [ ] 4.4 Test ghost rendering after schema migration (schema_version bump)

- [ ] Task 5 — TypeScript and testing
  - [ ] 5.1 Ensure `npx tsc --noEmit` passes with zero new errors
  - [ ] 5.2 Add unit tests for ghost detection logic (deletedEntryIds memoization)
  - [ ] 5.3 Add unit tests for RelationTagChip with `isGhost` prop variations
  - [ ] 5.4 Add integration tests: create entry → link target → soft-delete target → verify ghost render

## Dev Notes

### Architecture Guardrails

**From Architecture Document (Story-Relevant Extract):**
- **Data Integrity:** Ghost References (soft-delete) prevents crashes when remote entries are deleted before local sync
- **Relation Rendering Pattern:** Use `relationTarget` schema field to determine target ledger; filter deletedEntryIds from that ledger only
- **Error Handling:** All rendering errors must propagate through the global error store pattern — no local try/catch in components

### Code Patterns Established

**From Story 3.13 (Bidirectional Link Writing) — Key Implementation Insights:**
- Backlinks are stored as metadata in `backLinks?: BackLinkMetadata[]` on target entries
- When updating relations, diff old vs new targets and apply add/remove patches
- Soft-delete pattern: set `isDeleted?: boolean` flag on entry, do NOT remove from database
- `find_entries_with_relation_to` is the fallback query if indexed backlinks unavailable

**From Story 3.9 (Data Lab Keyboard-First Inline Entry Row):**
- InlineEntryRow uses ref-based keyboard navigation (Tab, Shift+Tab, Enter, Escape)
- RelationCombobox loads and filters targets on mount via `fetchEntries`
- Field rendering happens via `FieldInput` component with conditional logic per field type

**From Story 3.8 (Header Custom Sorting):**
- Column widths are tracked in local state `columnWidths` record
- Memoization is critical: use `useMemo` for derived data (deletedEntryIds already follows this pattern)

**From Previous Story (3.13) Git Patterns:**
- Commits follow format: `feat(feature-name): description` or `fix(area): description`
- Story files document learnings for next story (do this at completion)
- Code review cycles verify: no breaking regressions, all AC met, TypeScript strict passing

### Project Structure Notes

**Relevant Directories:**
- `src/features/ledger/` — All relation-rendering components (LedgerTable, RelationTagChip, InlineEntryRow, BackLinksPanel)
- `src/stores/useLedgerStore.ts` — Zustand store managing entries, schemas, backLinks queries
- `src/types/ledger.ts` — LedgerEntry, SchemaField, BackLinkMetadata types

**Code Files to Touch:**
1. `src/features/ledger/LedgerTable.tsx` (line ~140+) — Cell rendering where RelationTagChip is called; ensure `isGhost` flag is passed
2. `src/features/ledger/RelationTagChip.tsx` — Already has `isGhost` prop; verify styling is complete
3. `src/features/ledger/InlineEntryRow.tsx` (line ~150+) — FieldInput rendering for relation type; pass ghost flag to combobox
4. `src/features/ledger/BackLinksPanel.tsx` (line ~45+) — BackLinkItem rendering; filter or mark soft-deleted entries if necessary
5. `tests/` — Add unit/integration tests per AC

### Testing Standards Summary

- All tests reside in `/tests` directory (mandatory per project-context.md)
- Use Vitest for unit tests, Playwright for E2E
- Coverage target: 80% on core data layer functions
- Regression suite: previous stories' tests remain untouched

## Previous Story Intelligence (Story 3.13: Bidirectional Link Writing)

**What Was Learned:**
- Backlink metadata is recomputable but beneficial to index for query performance
- Soft-delete (isDeleted flag) + restore lifecycle requires careful handling of derived metadata
- Batched writes (`bulkPatchDocuments`) prevent N² performance issues on large entry sets
- PouchDB reserved fields (underscore-prefixed) must never be used for custom data

**Code Patterns Established:**
- Relation extraction: filter schema fields by `type === 'relation'` and extract target IDs from entry.data
- Diff helpers: compare previous vs next sets to determine patches needed
- Backlink patches: structured as add/remove operations, applied atomically in entry lifecycle

**Review Findings:**
- String typos in error messages were caught in code review
- Soft-delete semantics clarified: isDeleted flag is the single source of truth
- Performance: use Set for O(1) lookups when checking if entry is in a deleted set

**Testing Coverage from Story 3.13:**
- Create/update/delete/restore backlink cycles tested
- Schema-aware extraction verified (non-relation fields ignored)
- Cross-ledger compatibility confirmed (backlinks work across different schemas)

## Git Intelligence (Last 5 Commits)

**Commit Pattern Analysis:**
- Commit 1: `Story 3.13: Bidirectional Link Writing — code review fixes and validation` (main branch)
- Commit 2: `feat(story-3.13): implement bidirectional backlink reconciliation`
- Commit 3: `docs(story): create story 3-13 and mark ready-for-dev`
- Commit 4: `fix(ledger): finalize story 3-12 bulk actions and sync status to done`
- Commit 5: `fix(data-lab): resolve story 3-12 bulk-selection review findings`

**Actionable Insights:**
- Story files are created BEFORE implementation (`docs(story):` commits)
- Code review cycle is mandatory; fixes applied in separate `fix(...)` commits
- Story number and title appear in commit messages for traceability
- Data layer logic (backlink reconciliation) uses `feat(...)` prefix; UI fixes use `fix(...)`

## Latest Tech Information

**WebCrypto & Browser APIs (Current):**
- No external libraries required for ghost detection (uses native Set, array includes)
- Memoization via `useMemo` hook is the performance optimization pattern

**React 19 Patterns (Current):**
- Component props passed directly (no Provider wrapping needed for RelationTagChip isGhost flag)
- useRef for DOM element caching continues to be used (as seen in LedgerTable)

**Styling with Tailwind (Current):**
- Ghost appearance: `bg-zinc-800 border-zinc-700 text-zinc-500 line-through cursor-not-allowed`
- Disabled button style: use `disabled={true}` attribute and corresponding class conditions
- Current active reference: `bg-emerald-900/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50`

## Project Context Reference

**Ledgy Architecture Principles (Relevant Extracts):**
- **Single User, Multi-Profile:** Each profile has its own PouchDB instance; deleted entries are soft-deleted locally
- **Relational Integrity:** Ghost References pattern prevents broken links when entries are deleted before sync
- **Schema Versioning:** `schema_version` field on every document enables JIT migrations (not required for this story but context)

**Key Restrictions:**
- PouchDB field names MUST NOT start with underscore (reserved for PouchDB internals)
- All dates must be ISO 8601 strings with timezone offset
- Tauri commands are Rust `snake_case`; React/TS code is `camelCase` or `PascalCase`

## Dev Agent Record

### Agent Model Used

[To be filled by implementing agent]

### Debug Log References

[To be filled by implementing agent with references to test failures, console logs, or debugging steps]

### Completion Notes List

[To be filled by implementing agent with learnings for next story, gotchas, or architectural decisions made]

### File List

[To be filled by implementing agent with exhaustive list of files created/modified]
