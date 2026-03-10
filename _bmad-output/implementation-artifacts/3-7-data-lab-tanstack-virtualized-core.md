# Story 3.7: Data Lab - Tanstack Virtualized Core

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user with a large ledger dataset,
I want the Data Lab table to render efficiently using TanStack's row virtualizer,
so that browsing 10,000+ entries stays smooth and responsive without DOM bloat.

## Acceptance Criteria

1. `@tanstack/react-virtual` is added as a production dependency in `package.json` and installed
2. `LedgerTable.tsx` uses `useVirtualizer` from `@tanstack/react-virtual`; the virtualizer's `getScrollElement` is bound to the scrollable container `ref`
3. Only visible rows (+ 10 overscan) are rendered to the DOM at any given time — rendering 10,000 entries must produce far fewer than 10,000 DOM row nodes
4. The virtualized grid container uses `role="grid"` on the scroll parent, `role="row"` on each row div, and `role="gridcell"` on each cell div (WCAG 2.1 AA grid pattern)
5. A sticky column header row renders above the scrollable virtualizer body, showing schema field names with type labels — identical to the existing header behaviour
6. The `InlineEntryRow` (add/edit mode) renders at the top of the scrollable body **outside** the virtualizer virtual-items loop; its presence does not shift or corrupt virtual item indices
7. Clicking a row selects it (updates `selectedRow` state and opens the right inspector via `setSelectedEntryId` / `setRightInspector`); the `BackLinksPanel` split-pane opens for the selected entry as before
8. `ArrowUp`/`ArrowDown` keyboard navigation, `N` hotkey for new entry, and `Delete`/`Backspace` soft-delete on a selected row all function identically to the pre-virtualization implementation
9. The `highlightEntryId` prop causes the matching row to receive the emerald highlight class — identical to pre-virtualization behaviour
10. Recently-committed rows receive the `animate-slide-down-row` highlight flash for 2 seconds — identical to pre-virtualization behaviour
11. Zero TypeScript errors: `npx tsc --noEmit`
12. All existing tests in `tests/LedgerTable.test.tsx` pass after adding the `@tanstack/react-virtual` vitest mock to that file
13. ≥ 5 new tests in `tests/dataLabVirtualizedCore.test.tsx` covering: virtualizer instantiation, visible-row-count constraint, inline entry row rendered outside virtualizer, row selection on click, and keyboard `N` hotkey

## Tasks / Subtasks

- [ ] Task 1 — Install `@tanstack/react-virtual` (AC: #1)
  - [ ] Run `npm install @tanstack/react-virtual` in project root
  - [ ] Verify entry appears in `package.json` `"dependencies"` (not `"devDependencies"`)

- [ ] Task 2 — Refactor `LedgerTable.tsx` to use `useVirtualizer` (AC: #2, #3, #4, #5, #6)
  - [ ] Add `import { useVirtualizer } from '@tanstack/react-virtual';` at the top
  - [ ] Add `scrollContainerRef = useRef<HTMLDivElement>(null)` for the scroll container
  - [ ] Instantiate `rowVirtualizer = useVirtualizer({ count: ledgerEntries.length, getScrollElement: () => scrollContainerRef.current, estimateSize: () => 36, overscan: 10 })`
  - [ ] Replace the `<Table>` / `<TableBody>` element tree with a div-based layout using `role="grid"` / `role="row"` / `role="gridcell"` ARIA roles
  - [ ] Keep the sticky header as a separate non-scrolling `div` above the scroll container (same field names + type labels as before)
  - [ ] Inside the scroll container, render `InlineEntryRow` first (when `isAddingEntry` is true), then a `<div style={{ height: rowVirtualizer.getTotalSize() + 'px', position: 'relative' }}>` containing `{rowVirtualizer.getVirtualItems().map(...)}` with `position: absolute; transform: translateY(...px)` on each virtual row div
  - [ ] Remove the `Table`, `TableBody`, `TableHeader`, `TableRow`, `TableHead`, `TableCell` Shadcn table imports (no longer used in the main grid — `InlineEntryRow` still uses `TableRow`/`TableCell` internally)

- [ ] Task 3 — Preserve all interactive behaviour (AC: #7, #8, #9, #10)
  - [ ] Keyboard handler (`useEffect` on `window.addEventListener('keydown', ...)`) — keep identical logic: `ArrowUp`, `ArrowDown`, `N`/`n`, `Delete`/`Backspace`
  - [ ] Row click handler — keep `setSelectedRow(index)`, `setSelectedEntryId(entry._id)`, `setRightInspector(true)` identical
  - [ ] `highlightEntryId` emerald highlight class — apply per virtual row using `entry._id === highlightEntryId`
  - [ ] `recentlyCommittedId` flash animation — apply per virtual row using `recentlyCommittedId === entry._id`
  - [ ] `BackLinksPanel` split-pane render based on `selectedEntry` — keep identical (rendered alongside the scroll container in a flex sibling)
  - [ ] Double-click to edit row — keep `setEditingEntryId(entry._id)`; when a row is in edit mode, render `InlineEntryRow` **in place of** the virtual row div for that index (replace the virtual item's content with `InlineEntryRow`)

- [ ] Task 4 — Update `tests/LedgerTable.test.tsx` to add `@tanstack/react-virtual` mock (AC: #12)
  - [ ] Add `vi.mock('@tanstack/react-virtual', () => ({ useVirtualizer: vi.fn().mockImplementation(({ count, estimateSize }) => ({ getVirtualItems: () => Array.from({ length: count }, (_, i) => ({ index: i, key: i, start: i * estimateSize(), size: estimateSize() })), getTotalSize: () => count * estimateSize(), measureElement: vi.fn() })) }))` to the top of `tests/LedgerTable.test.tsx`
  - [ ] Run existing tests to confirm all 6 pass

- [ ] Task 5 — Write new tests in `tests/dataLabVirtualizedCore.test.tsx` (AC: #13)
  - [ ] Test: `useVirtualizer` called with `count = ledgerEntries.length` when entries are present
  - [ ] Test: with 3 entries visible, the mock virtualizer produces exactly 3 rendered row elements (not 10,000)
  - [ ] Test: `InlineEntryRow` renders when Add Entry button is clicked (outside virtualizer loop)
  - [ ] Test: clicking a rendered row calls `setSelectedEntryId` with that entry's `_id`
  - [ ] Test: pressing `N` key opens the inline entry row (`Save` button appears)
  - [ ] File: `tests/dataLabVirtualizedCore.test.tsx`

- [ ] Task 6 — TypeScript and regression check (AC: #11)
  - [ ] `npx tsc --noEmit` → 0 errors
  - [ ] `npx vitest run` → all pre-existing tests passing + ≥ 5 new tests passing

## Dev Notes

### What This Story Is

This story replaces the existing all-rows DOM rendering in `LedgerTable.tsx` with a windowed/virtualized approach using `@tanstack/react-virtual`. The current implementation maps every `ledgerEntries[]` element into a DOM row unconditionally — for 10,000 entries, that is 10,000 row nodes. The virtualizer maintains a window of only ~20–30 visible rows + overscan, keeping the DOM lean regardless of dataset size.

**Critical scope boundary**: This story only introduces the virtualized grid skeleton. Sorting (Story 3-8), keyboard-first inline entry (Story 3-9), relation combobox (Story 3-10), full focus management (Story 3-11), and bulk selection (Story 3-12) will be layered on top in subsequent stories. Do NOT implement those features in this story, even if gaps are visible.

### `@tanstack/react-virtual` — API Reference (v3.x)

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const scrollContainerRef = useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtualizer({
  count: ledgerEntries.length,         // total number of rows
  getScrollElement: () => scrollContainerRef.current,
  estimateSize: () => 36,              // estimated px height per row
  overscan: 10,                        // render 10 rows beyond visible window
});

// In JSX — the scroll container must have a fixed height and overflow-y: auto/scroll
<div
  ref={scrollContainerRef}
  style={{ overflowY: 'auto', flex: 1 }}
>
  {/* InlineEntryRow goes here FIRST (not inside virtualizer) */}
  <div
    style={{
      height: `${rowVirtualizer.getTotalSize()}px`,
      position: 'relative',
    }}
  >
    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
      const entry = ledgerEntries[virtualRow.index];
      return (
        <div
          key={entry._id}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }}
        >
          {/* row content */}
        </div>
      );
    })}
  </div>
</div>
```

Key rules:
- `getScrollElement` must return the DOM element that has `overflow: auto` — this is the virtualizer's scroll event source
- `estimateSize` should approximate the actual rendered row height; 36px is a good starting estimate for the current dense layout
- Do **not** use `measureElement` (dynamic measurement) in this story — `estimateSize` is sufficient for uniform rows
- `getTotalSize()` gives the total virtual height of all rows; the inner div must have this height to enable proper scroll behaviour
- `getVirtualItems()` returns only the currently-visible rows plus overscan — iterate these to render DOM nodes

### DOM Structure — div-based Grid (Not `<table>`)

The native `<table>` element does not support `position: absolute` on `<tr>` children, so the virtualizer requires a div-based layout. Use ARIA roles to maintain accessibility:

```html
<!-- Sticky header (not scrolled) -->
<div role="rowgroup" class="sticky-header">
  <div role="row">
    <div role="columnheader">Name (text)</div>
    <div role="columnheader">Amount (number)</div>
  </div>
</div>

<!-- Scrollable virtualizer body -->
<div role="grid" ref={scrollContainerRef} style="overflow-y: auto; flex: 1">
  <!-- InlineEntryRow uses TableRow/TableCell internally — wrap in a div to break table context -->
  {isAddingEntry && <div><InlineEntryRow .../></div>}
  
  <!-- Virtual spacer with absolute-positioned rows -->
  <div style="height: {totalSize}px; position: relative">
    {virtualItems.map(virtualRow => (
      <div role="row" style="position: absolute; transform: translateY({start}px); ...">
        <div role="gridcell">{value}</div>
        <div role="gridcell">{value}</div>
      </div>
    ))}
  </div>
</div>
```

**Note on `InlineEntryRow`**: `InlineEntryRow` uses `TableRow`/`TableCell` Shadcn components internally. Because it is rendered as a sibling to the virtualizer spacer div (not inside a `<table>`), the native table semantics are lost — but the component will still render visually. Do NOT refactor `InlineEntryRow` in this story to change its internal table elements; that is deferred to Story 3-9. The `<table>`-inside-a-`<div>` will produce a minor a11y warning but is acceptable for now.

### Shadcn Table Imports in `LedgerTable.tsx`

After the refactor, the Shadcn `Table`, `TableBody`, `TableHeader`, `TableRow`, `TableHead`, `TableCell` imports are no longer used by the main grid. However, `InlineEntryRow` (which is a separate component in `InlineEntryRow.tsx`) still uses `TableRow` and `TableCell` internally. Do **not** remove those imports from `InlineEntryRow.tsx`. Only remove the unused table imports from `LedgerTable.tsx`.

### Row Height Assumptions

The current `LedgerTable.tsx` rows are styled with standard padding. Assuming Inter 14px body text with Tailwind `py-2` (8px top + 8px bottom) + border = approximately 36px. This is the initial `estimateSize`. If future stories introduce taller rows (e.g., multi-line relation chips), the `estimateSize` can be updated then.

### `editingEntryId` — In-Place Edit Within Virtualizer

When a row is double-clicked, `editingEntryId` is set to that entry's `_id`. In the virtualizer loop, check `if (editingEntryId === entry._id)` and render `InlineEntryRow` **inside** the virtual row div (in place of the read-only cells). This means the editing row stays in its scroll position rather than jumping to the top. Example:

```tsx
{rowVirtualizer.getVirtualItems().map((virtualRow) => {
  const entry = ledgerEntries[virtualRow.index];
  const isEditing = editingEntryId === entry._id;
  return (
    <div key={entry._id} role="row" style={{ position: 'absolute', transform: `translateY(${virtualRow.start}px)`, ... }}>
      {isEditing ? (
        <InlineEntryRow schema={schema} entry={entry} onCancel={...} onComplete={...} />
      ) : (
        schema.fields.map(field => (
          <div key={field.name} role="gridcell">{renderFieldValue(...)}</div>
        ))
      )}
    </div>
  );
})}
```

Note: The add-entry `InlineEntryRow` (no `entry` prop) stays at the top, outside the virtualizer, so new entries always appear prominently regardless of scroll position.

### Testing `@tanstack/react-virtual` in Vitest/jsdom

jsdom has no real layout engine, so `scrollContainerRef.current.clientHeight` is always 0. The virtualizer will produce 0 virtual items unless mocked. The correct approach is to mock `@tanstack/react-virtual` in both the existing `LedgerTable.test.tsx` and the new `dataLabVirtualizedCore.test.tsx`:

```typescript
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn().mockImplementation(({ count, estimateSize }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(),
        size: estimateSize(),
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: vi.fn(),
  })),
}));
```

This mock makes all `count` items visible — equivalent to the pre-virtualization behaviour — so all existing interaction tests continue to pass.

**Modifying `tests/LedgerTable.test.tsx`**: This is required to add the mock. You are NOT removing tests; you are adding a `vi.mock(...)` block at the top of the file. This is explicitly permitted.

### `useUIStore` Mock in Tests

The current `tests/LedgerTable.test.tsx` does NOT mock `useUIStore`. This works because Zustand stores function normally in jsdom (they use in-memory state). After the refactor, `useUIStore` is still imported in `LedgerTable.tsx`. Continue not mocking it — the store works without mocking. The new `dataLabVirtualizedCore.test.tsx` tests that check `setSelectedEntryId` behaviour will need to mock `useUIStore`:

```typescript
vi.mock('../src/stores/useUIStore', () => ({
  useUIStore: vi.fn().mockReturnValue({
    setSelectedEntryId: vi.fn(),
    setRightInspector: vi.fn(),
  }),
}));
```

### `renderFieldValue` Function — No Change

The `renderFieldValue` function at the bottom of `LedgerTable.tsx` is unchanged. It is called in the same way from each virtual row's `role="gridcell"` divs. Ghost reference detection via `deletedEntryIds` set is unchanged.

### Previous Story Carry-Forward (from Story 3-6 Dev Agent Record)

The following low-priority items from prior code reviews remain open and are NOT in scope for this story:

- `[AI-Review][LOW]` `key={index}` on reorderable field rows in `SchemaBuilder.tsx` — not in scope
- `[AI-Review][LOW]` `DialogTitle` hardcoded to "Create" in `SchemaBuilder.tsx` — not in scope
- `[AI-Review][MEDIUM]` `Date.parse` timezone sensitivity in `buildZodSchemaFromLedger` — not in scope

### Files to Touch

| File | Change |
|---|---|
| `package.json` | Add `@tanstack/react-virtual` to `"dependencies"` (via `npm install`) |
| `package-lock.json` | Updated automatically by `npm install` |
| `src/features/ledger/LedgerTable.tsx` | **MODIFIED** — add `useVirtualizer`; replace `<Table>` tree with div-based virtualizer grid |
| `tests/LedgerTable.test.tsx` | **MODIFIED** — add `vi.mock('@tanstack/react-virtual', ...)` mock block at top |
| `tests/dataLabVirtualizedCore.test.tsx` | **NEW** — ≥ 5 virtualization-specific tests |

### Files to NOT Touch

- `src/features/ledger/InlineEntryRow.tsx` — no changes needed; used as-is
- `src/features/ledger/LedgerView.tsx` — no changes needed; passes `schemaId` and `highlightEntryId` as before
- `src/features/ledger/RelationTagChip.tsx` — no changes needed
- `src/features/ledger/BackLinksPanel.tsx` — no changes needed
- `src/stores/useLedgerStore.ts` — no changes needed; virtualization is purely a rendering concern
- `src/lib/db.ts` / `src/lib/migration.ts` — no changes needed; data layer is unchanged
- `src/components/ui/table.tsx` — do NOT modify; used by `InlineEntryRow.tsx`

### Do NOT Introduce

- `@tanstack/react-table` (TanStack Table) — this story uses only `@tanstack/react-virtual` (the virtualizer), NOT the table/column management package
- Any sorting logic — that is Story 3-8
- Any keyboard focus trap or Tab management — that is Story 3-11
- Any bulk checkbox column — that is Story 3-12
- Any new Zustand store or store slice

### Pre-existing Test Baseline

From Story 3-6 completion:
- **Files:** 63 test files
- **Passing:** 559
- **Skipped:** 1
- **Failures:** 0

This story modifies `tests/LedgerTable.test.tsx` (adds mock — no test removal) and adds `tests/dataLabVirtualizedCore.test.tsx` with ≥ 5 new passing tests.

### References

- `useVirtualizer` API: [Source: `@tanstack/react-virtual` v3 docs — `getVirtualItems`, `getTotalSize`, `estimateSize`, `overscan`, `getScrollElement`]
- Current `LedgerTable.tsx` grid structure: [Source: `src/features/ledger/LedgerTable.tsx`]
- Accessibility grid pattern (`role="grid"`, `role="gridcell"`): [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — "Accessibility Considerations"]
- `InlineEntryRow` component contract: [Source: `src/features/ledger/InlineEntryRow.tsx`]
- `BackLinksPanel` contract: [Source: `src/features/ledger/BackLinksPanel.tsx`]
- `useLedgerStore` entries shape: [Source: `src/stores/useLedgerStore.ts` — `entries: Record<string, LedgerEntry[]>`]
- `useUIStore` calls: [Source: `src/features/ledger/LedgerTable.tsx#L27` — `setSelectedEntryId`, `setRightInspector`]
- Testing mock pattern: [Source: `tests/LedgerTable.test.tsx` — `vi.mock` for store mocking]
- Test location rule (non-negotiable): [Source: `docs/project-context.md` — "All test files MUST reside in the `/tests` directory"]
- Performance target (<50ms latency): [Source: `_bmad-output/planning-artifacts/architecture.md` — Non-Functional Requirements]
- Epic 3 Data Lab story descriptions: [Source: `_bmad-output/planning-artifacts/epics.md` — Stories 3.7–3.12]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
