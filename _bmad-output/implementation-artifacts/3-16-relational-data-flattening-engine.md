# Story 3.16: Relational Data Flattening Engine

Status: ready-for-dev

## Story

As a ledger user,
I want relation fields in data tables to display human-readable text instead of raw UUIDs,
so that I can read and understand relational data at a glance without manually cross-referencing other ledgers.

## Acceptance Criteria

1. **Basic resolution** — Each relation field cell in `LedgerTable` shows the display value of the referenced entry (e.g., the first populated text/number field), not the raw UUID string.
2. **Multi-value relations** — When a relation field holds multiple UUIDs, each UUID is resolved and displayed as a separate readable tag chip.
3. **Up to 3 levels deep** — If Ledger A's entry links to Ledger B, which links to Ledger C, the resolved display values are shown at all three levels. Levels 4+ are not traversed; the resolution stops at depth 3.
4. **Ghost reference display** — If a resolved relation target is soft-deleted (`isDeleted: true`) or not found, the chip renders in the existing ghost style (strikethrough, muted) with a `"[Deleted]"` display value (consistent with Story 3-14 ghost pattern).
5. **Cycle prevention** — Circular relation chains (A → B → A) do not cause infinite loops; visited entry IDs are tracked and further recursion is skipped, rendering `"[Circular]"` for repeated nodes.
6. **Sort by display value** — When sorting by a relation column in `LedgerTable`, the sort uses the resolved display value string, not the raw UUID.
7. **Performance** — Flattening of all visible rows is computed via `useMemo` keyed on `sortedEntries`, `entries`, and `schemas` from the Zustand store. No additional PouchDB reads are issued during flattening (uses already-loaded in-memory data only).
8. **Backward-compatible** — `RelationTagChip` continues to work correctly when `resolvedValues` are not provided (raw UUID fallback).
9. **Type-safe** — `FlattenedEntry` and `ResolvedRelationValue` types are exported from `src/types/ledger.ts`. `flattenEntry` and `flattenEntries` are exported from `src/lib/flattenRelations.ts`.
10. **Unit tested** — `flattenRelations.ts` has co-located unit tests covering: basic resolution, multi-value relations, 3-level depth, ghost references, cycle detection, and missing schema graceful fallback.
11. **No new PouchDB writes** — This is a pure read/display concern; no documents are written to the database as part of flattening.

## Tasks / Subtasks

- [ ] Task 1 — Add types to `src/types/ledger.ts` (AC: #9)
  - [ ] 1.1 Add `ResolvedRelationValue` interface: `{ id: string; displayValue: string; isGhost: boolean }`
  - [ ] 1.2 Add `FlattenedEntry` interface: extends `LedgerEntry` with `resolvedRelations?: Record<string, ResolvedRelationValue[]>`

- [ ] Task 2 — Create `src/lib/flattenRelations.ts` pure-function utility (AC: #1, #2, #3, #4, #5, #7, #9, #11)
  - [ ] 2.1 Implement `getEntryDisplayValue(entry: LedgerEntry, schema?: LedgerSchema): string`
    - Iterate `schema.fields` in order; return the stringified value of the first field whose `data[fieldName]` is a non-empty, non-relation value
    - Fallback: if no displayable field found, return the last 8 chars of `entry._id` (e.g., `"…a3f9c2b1"`)
    - Do NOT use `_id` directly as the display — use the UUID suffix fallback
  - [ ] 2.2 Implement `flattenEntry(entry: LedgerEntry, schema: LedgerSchema | undefined, allEntriesByLedgerId: Record<string, LedgerEntry[]>, allSchemasBySchemaId: Record<string, LedgerSchema>, depth: number, maxDepth: number, visited: Set<string>): FlattenedEntry`
    - `depth` starts at 0 on initial call; max is `maxDepth` (default 3)
    - For each field where `field.type === 'relation'`:
      - Normalize value to `string[]` using same logic as `normalizeRelationTargetIds` pattern from `db.ts`
      - For each UUID in the array:
        - If UUID is in `visited` → push `{ id, displayValue: '[Circular]', isGhost: false }`, skip recursion
        - Look up entry in `allEntriesByLedgerId[field.relationTarget ?? '']`
        - If not found or `isDeleted` → push `{ id, displayValue: '[Deleted]', isGhost: true }`, skip recursion
        - Otherwise: add `id` to `visited` clone for this subtree, recurse to get `FlattenedEntry`, push `{ id, displayValue: getEntryDisplayValue(resolvedEntry, resolvedSchema), isGhost: false }`
    - Returns `FlattenedEntry` with `resolvedRelations` populated
    - When `depth >= maxDepth` → stop recursion and use only `getEntryDisplayValue` for display
  - [ ] 2.3 Implement `flattenEntries(entries: LedgerEntry[], schema: LedgerSchema | undefined, allEntriesByLedgerId: Record<string, LedgerEntry[]>, allSchemasBySchemaId: Record<string, LedgerSchema>, maxDepth?: number): FlattenedEntry[]`
    - Maps over `entries`, calling `flattenEntry` for each with a fresh `visited` Set per entry
  - [ ] 2.4 Export all three from the module

- [ ] Task 3 — Unit tests: `src/lib/flattenRelations.test.ts` (AC: #10)
  - [ ] 3.1 Basic resolution: relation field UUID → display value from target entry's first text field
  - [ ] 3.2 Multi-value: two UUIDs in one relation field → two resolved chips
  - [ ] 3.3 Depth limit: 3-level chain A→B→C resolves all three; 4th level shows raw UUID suffix (depth exhausted)
  - [ ] 3.4 Ghost: target entry has `isDeleted: true` → `{ displayValue: '[Deleted]', isGhost: true }`
  - [ ] 3.5 Missing entry: UUID not found in any ledger entries → `{ displayValue: '[Deleted]', isGhost: true }`
  - [ ] 3.6 Cycle: A.relField = B._id, B.relField = A._id → second visit returns `{ displayValue: '[Circular]', isGhost: false }`
  - [ ] 3.7 Missing schema: `schema` is `undefined` → returns entry as-is (`resolvedRelations` empty)
  - [ ] 3.8 No relation fields: schema with only text/number fields → `resolvedRelations` is empty `{}`

- [ ] Task 4 — Update `RelationTagChip` to accept pre-resolved values (AC: #1, #4, #8)
  - [ ] 4.1 Add optional prop `resolvedValues?: ResolvedRelationValue[]` to `RelationTagChipProps`
  - [ ] 4.2 When `resolvedValues` is provided, render each chip using `resolvedValues[i].displayValue` as the label and `resolvedValues[i].isGhost` for ghost styling — keep `value` prop for navigation (still need IDs for `handleClick`)
  - [ ] 4.3 When `resolvedValues` is NOT provided, keep current behavior (render raw UUID from `value`)
  - [ ] 4.4 Ensure `title` tooltip still shows the raw ID for debugging: `title={val}` on each badge

- [ ] Task 5 — Integrate flattening into `LedgerTable` (AC: #1, #2, #6, #7)
  - [ ] 5.1 Import `flattenEntries` and `FlattenedEntry` in `LedgerTable.tsx`
  - [ ] 5.2 Add `useMemo` after `sortedEntries` computation:
    ```ts
    const flattenedEntries = useMemo(
      () => flattenEntries(sortedEntries, schema, entries, Object.fromEntries(schemas.map(s => [s._id, s]))),
      [sortedEntries, schema, entries, schemas]
    );
    ```
  - [ ] 5.3 Update the sort comparator for `case 'relation'` to use `resolvedRelations` display values from the (pre-sort) flattened versions when available, falling back to raw UUID
    - Note: sort operates on `ledgerEntries` before flattening, so build a quick `Map<entryId, FlattenedEntry>` if needed, or sort `flattenedEntries` directly
    - Simplest approach: replace `sortedEntries` sort with sorting `flattenedEntries` (computed from raw `ledgerEntries`), using `resolvedRelations[field]?.[0]?.displayValue` for relation column comparison
  - [ ] 5.4 Update `renderFieldValue` call at line ~594 to pass the `FlattenedEntry` from `flattenedEntries`
  - [ ] 5.5 In `renderFieldValue` (`case 'relation'`): extract `resolvedValues` from `(entry as FlattenedEntry).resolvedRelations?.[field?.name ?? '']` and pass to `RelationTagChip`

## Dev Notes

### Architecture Guardrails

- **Pure function, no side effects** — `flattenRelations.ts` must be a pure utility with zero Zustand/PouchDB imports. All data flows in as arguments.
- **No new DB reads** — Flattening uses only the already-loaded `entries` and `schemas` from the Zustand store. Do NOT call `getProfileDb`, `list_entries`, or any async DB function inside `flattenRelations.ts`.
- **No local useState for derived data** — `flattenedEntries` must be `useMemo`, not `useState`. This is a strict architecture requirement from the project.
- **Relation field values are stored as raw UUID strings** — `entry.data[fieldName]` is a `string` (single) or `string[]` (multi). Normalize with the same `Array.isArray` check used throughout the codebase.
- **`schema.fields` drive relation discovery** — Fields with `type === 'relation'` have a `relationTarget` pointing to the ledger's `schemaId` (which is the same as `ledgerId` in this project). Use `field.relationTarget` to look up in `allEntriesByLedgerId`.
- **`entries` in `useLedgerStore`** is `Record<string, LedgerEntry[]>` keyed by `ledgerId` — this is the same as `schemaId`.
- **Ghost reference visual style is already established** — `RelationTagChip` has ghost styling: `bg-zinc-800 border-zinc-700 text-zinc-500 line-through cursor-not-allowed`. Reuse it; do not invent a new style.
- **`FlattenedEntry` must extend `LedgerEntry`** — keep strict TypeScript compatibility so existing code that expects `LedgerEntry[]` still compiles. Do not use `as FlattenedEntry` casts in render paths without guarding.

### Display Value Strategy

`getEntryDisplayValue` must return a human-readable string. Priority order:
1. First field in `schema.fields` that is NOT `type === 'relation'` and whose `entry.data[fieldName]` is truthy
2. Stringified: `String(entry.data[firstFieldName])`
3. Fallback: `"…" + entry._id.slice(-8)` (UUID suffix, 8 chars)

This ensures even entries with all-empty fields get a unique identifier. The `…` prefix signals it's a UUID fallback.

### visitied Set Cloning (Cycle Prevention)

Each recursive call must pass a **copy** of `visited` (not the same Set reference):
```ts
const nextVisited = new Set(visited);
nextVisited.add(targetEntry._id);
flattenEntry(..., nextVisited); // pass the copy
```
This prevents siblings from blocking each other's resolution (e.g., two separate fields pointing to the same target should each resolve independently — only within-chain cycles are blocked).

### Sorting Refactor

The current sort in `LedgerTable` sorts `ledgerEntries`. After this story:
- Compute `flattenedLedgerEntries = flattenEntries(ledgerEntries, ...)` (pre-sort)
- Sort `flattenedLedgerEntries` using `resolvedRelations?.[field]?.[0]?.displayValue` for relation columns
- Result becomes `flattenedSortedEntries` — used for both display and sort

This simplifies the `useMemo` chain since a single `flattenedSortedEntries` memo replaces the separate `sortedEntries` + `flattenedEntries` pass.

### Files to Create

- `src/lib/flattenRelations.ts` — new file, pure utility
- `src/lib/flattenRelations.test.ts` — co-located unit tests

### Files to Modify

- `src/types/ledger.ts` — add `ResolvedRelationValue` and `FlattenedEntry` types
- `src/features/ledger/RelationTagChip.tsx` — add optional `resolvedValues` prop
- `src/features/ledger/LedgerTable.tsx` — integrate flattening + update sort + update render

### Previous Story Intelligence (Story 3-15)

- Story 3-15 is done. Its deferred items D1–D10 are tracked in `_bmad-output/implementation-artifacts/deferred-work.md` — do NOT address them here.
- **Pattern confirmed**: Co-located test files (e.g., `useUndoRedoStore.test.ts` next to `useUndoRedoStore.ts`) — follow this for `flattenRelations.test.ts`.
- **Pattern confirmed**: Pure logic in `src/lib/`, React integration in `src/features/ledger/` — follow this split.

### Existing Code Patterns (DO NOT REINVENT)

- `normalizeRelationTargetIds` in `src/lib/db.ts:614` — logic for parsing relation values to `string[]`. **Inline equivalent logic in `flattenRelations.ts`** (don't import from `db.ts`; that file has PouchDB dependencies and is not a clean util module).
- `RelationTagChip` at `src/features/ledger/RelationTagChip.tsx` — already handles ghost/normal chip styling. Extend it, don't replace it.
- `renderFieldValue` at `src/features/ledger/LedgerTable.tsx:620` — already dispatches by `type`. Add `resolvedValues` passing inside the `case 'relation'` branch.
- `deletedEntryIds` set in `LedgerTable` (computed from `allEntries`) — this was the Story 3-14 ghost detection mechanism. After this story, ghost status comes from `ResolvedRelationValue.isGhost`. The `deletedEntryIds` set can remain as a backward compat fallback (don't remove it), but the primary ghost signal for `RelationTagChip` is now `isGhost` from resolved values.

### Testing Standards

- Vitest + co-located test files (e.g., `src/lib/flattenRelations.test.ts`)
- All tests are pure (no PouchDB, no DOM, no Zustand) since `flattenRelations.ts` is a pure function
- Use `describe`/`it` blocks, no `test()` blocks (project convention)
- `npx tsc --noEmit` must pass with zero new errors after changes

### Project Structure Notes

- New file goes in `src/lib/` (shared utilities, no React/Zustand) — consistent with `migration.ts`, `validation.ts`, `crypto.ts`
- Types go in `src/types/ledger.ts` — extends the existing file, do NOT create a new types file
- No new Zustand store slices — `flattenedEntries` is a `useMemo` inside `LedgerTable`, not a store action
- No new React components — work within existing `RelationTagChip` and `LedgerTable`

### Architecture Doc Reference

- FR15 (`prd.md:172`): "The system can automatically retrieve and flatten deeply nested relational data (up to 3 levels deep) for continuous, lag-free UI presentation in data tables."
- Project structure (`architecture.md:276`): `src/features/ledger/` = Relational Ledger Engine; `src/lib/` = shared utilities
- Performance requirement: <50ms latency — `useMemo` achieves this for typical ledger sizes (thousands of entries)
- No `useState` for async layers (`architecture.md:244`)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (create-story workflow, 2026-04-05)

### Debug Log References

### Completion Notes List

### File List
