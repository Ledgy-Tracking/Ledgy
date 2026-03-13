# Story 3.8: Data Lab - Header & Custom Sorting

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user working with large ledger datasets,
I want to click column headers to sort entries and drag column edges to resize them,
so that I can quickly find and compare data without leaving the Data Lab view.

## Acceptance Criteria

1. Clicking a `role="columnheader"` div with no existing sort for that field sets it as the primary sort column in ascending order (`▲` indicator shown)
2. Clicking the same column header again when sorted ascending flips it to descending order (`▼` indicator shown)
3. Clicking the same column header a third time (when descending) removes it from the sort config — the column returns to unsorted and entries return to insertion order
4. Shift+clicking a column header that is not yet in the sort config appends it as the next priority sort column (multi-column sort chain); existing primary sort is preserved
5. Shift+clicking a column that is already in the sort config toggles its direction (asc ↔ desc); Shift+clicking a descending column removes it from the chain
6. Each active sort column header displays a `▲` or `▼` glyph; when two or more columns are active, a superscript priority number (1, 2, …) appears next to each glyph
7. Each `role="columnheader"` div carries `aria-sort="ascending"`, `aria-sort="descending"`, or `aria-sort="none"` matching the current sort state
8. The `sortedEntries` array (derived via `useMemo`) is used as the data source for both the virtualizer `count` and the `virtualRow.index` → entry lookup; unsorted state uses the original `ledgerEntries` order
9. Sort is applied client-side across all field types: `text`/`long_text`/`select`/`multi_select` use `localeCompare`; `number` uses numeric subtraction; `date` compares ISO 8601 strings lexicographically; `boolean` sorts false before true; `relation` sorts by the first linked ID string
10. Null / undefined / empty-string field values sort to the **end** of the list regardless of direction
11. When the sort config changes, `selectedRow` is reset to `-1` (no row selected) to prevent stale index-to-entry mapping
12. Each column header has a **resize handle** — a 6px-wide draggable zone at its right edge (`cursor: col-resize`); dragging it updates the column width live (min 60 px)
13. Column widths are stored in `columnWidths: Record<string, number>` local state (default 150 px per field); the same width is applied to both the header cell and every corresponding data cell so columns stay aligned
14. The header row div and the data scroll container implement **synchronized horizontal scroll**: as the user scrolls the data container horizontally, the header row scrolls in lock-step via a `headerScrollRef` whose `scrollLeft` is updated from the data container's `onScroll` handler; the header's own scrollbar is hidden (`overflow-x: hidden`)
15. All pre-existing behavior is preserved with zero regressions: keyboard nav (ArrowUp/Down, N, Delete/Backspace), row click selection, double-click edit, `highlightEntryId` emerald class, `recentlyCommittedId` flash, `BackLinksPanel` split pane, `scrollToIndex` on arrow nav
16. Zero TypeScript errors: `npx tsc --noEmit`
17. All existing tests in `tests/LedgerTable.test.tsx` and `tests/dataLabVirtualizedCore.test.tsx` continue to pass without modification
18. ≥ 5 new tests in `tests/dataLabHeaderSorting.test.tsx` covering: single-column ascending sort, single-column descending sort (second click), sort removal (third click), Shift+click multi-column sort, and sort indicator rendering

## Tasks / Subtasks

- [x] Task 1 — Add sort state and sorted entries derivation (AC: #1–#11)
  - [x] Add `SortDirection` type (`'asc' | 'desc'`) and `SortColumn` interface (`{ field: string; direction: SortDirection }`) to `LedgerTable.tsx` (or extract to `src/types/ledger.ts` if reused)
  - [x] Add `const [sortConfig, setSortConfig] = useState<SortColumn[]>([])` in `LedgerTable`
  - [x] Implement `handleHeaderClick(fieldName: string, shiftKey: boolean)` — see Dev Notes for full logic
  - [x] Add `sortedEntries = useMemo(...)` using a stable multi-key comparator — see Dev Notes for full implementation
  - [x] Replace all references to `ledgerEntries` inside the virtualizer section with `sortedEntries` (virtualizer `count`, `virtualRow.index` lookup, keyboard handler bounds)
  - [x] Reset `selectedRow` to `-1` inside `handleHeaderClick` after updating sort config

- [x] Task 2 — Update column header JSX with sort indicator + click handler (AC: #1–#7)
  - [x] Add `onClick` and `onKeyDown` (Enter/Space) to each `role="columnheader"` div — call `handleHeaderClick(field.name, e.shiftKey)`
  - [x] Add `aria-sort` attribute: `"ascending"` | `"descending"` | `"none"` based on current `sortConfig`
  - [x] Add `cursor-pointer select-none` Tailwind classes to header cells
  - [x] Render sort glyph (`▲` / `▼`) and superscript priority badge when column is in `sortConfig`

- [x] Task 3 — Add column resize (AC: #12–#14)
  - [x] Add `const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})` in `LedgerTable`
  - [x] Add `resizeState = useRef<{ field: string; startX: number; startWidth: number } | null>(null)`
  - [x] Add `headerScrollRef = useRef<HTMLDivElement>(null)` for the header row scroll sync
  - [x] Implement `handleResizeMouseDown(e: React.MouseEvent, fieldName: string)` — see Dev Notes
  - [x] Add single `useEffect` for `mousemove` + `mouseup` on `window` to drive live resize and cleanup — see Dev Notes
  - [x] Apply `width: ${getColWidth(field.name)}px; flexShrink: 0` to both header cells and data `role="gridcell"` cells; replace `flex-1 min-w-0` class on those cells
  - [x] Wrap the existing header `<div role="row">` in a new scrollable div (`ref={headerScrollRef}`, `overflow-x: hidden`, `display: flex`)
  - [x] Add `onScroll` handler to `scrollContainerRef` div that syncs `headerScrollRef.current.scrollLeft`
  - [x] Add the resize handle `<div>` inside each header cell — see Dev Notes for exact markup

- [x] Task 4 — Write new tests in `tests/dataLabHeaderSorting.test.tsx` (AC: #18)
  - [x] Set up mock schema with `text` + `number` fields and 3 entries (values chosen to produce a deterministic sort order)
  - [x] Test: clicking a column header once renders entries in ascending order (first entry text should be alphabetically first)
  - [x] Test: clicking the same column header twice renders entries in descending order
  - [x] Test: clicking the same column header three times restores original insertion order
  - [x] Test: Shift+clicking a second column while a primary sort is active adds a secondary sort (`aria-sort` set on both headers)
  - [x] Test: sort indicator glyph (▲ or ▼) is present in column header text after first click
  - [x] File: `tests/dataLabHeaderSorting.test.tsx`

- [x] Task 5 — TypeScript and regression check (AC: #16, #17)
  - [x] `npx tsc --noEmit` → 0 errors
  - [x] `npx vitest run` → all pre-existing tests passing + ≥ 5 new tests passing

## Dev Notes

### Architecture Decision: Sort State Stays Local

Sort config is a **pure UI rendering concern** — it does not affect PouchDB, sync, or any other store. It belongs in `useState` local to `LedgerTable.tsx`. Do **not** add it to `useUIStore` or `useLedgerStore`.

### Type Definitions

Add these near the top of `LedgerTable.tsx` (before the component, or extract to `src/types/ledger.ts`):

```typescript
type SortDirection = 'asc' | 'desc';

interface SortColumn {
    field: string;
    direction: SortDirection;
}
```

### `handleHeaderClick` — Full Implementation

```typescript
function handleHeaderClick(fieldName: string, shiftKey: boolean) {
    setSortConfig(prev => {
        const existingIdx = prev.findIndex(s => s.field === fieldName);

        if (!shiftKey) {
            // Single-sort mode: cycle asc → desc → clear; always reset to single-column
            if (existingIdx === -1) return [{ field: fieldName, direction: 'asc' }];
            if (prev[existingIdx].direction === 'asc') return [{ field: fieldName, direction: 'desc' }];
            return []; // was desc → remove sort entirely
        } else {
            // Multi-sort mode: append/toggle/remove this field while preserving others
            if (existingIdx === -1) return [...prev, { field: fieldName, direction: 'asc' }];
            if (prev[existingIdx].direction === 'asc') {
                return prev.map((s, i) =>
                    i === existingIdx ? { ...s, direction: 'desc' as SortDirection } : s
                );
            }
            return prev.filter((_, i) => i !== existingIdx); // was desc → remove
        }
    });
    setSelectedRow(-1); // reset selection — index no longer maps to same entry
}
```

### `sortedEntries` — Full `useMemo` Implementation

```typescript
const sortedEntries = useMemo(() => {
    if (sortConfig.length === 0) return ledgerEntries;

    return [...ledgerEntries].sort((a, b) => {
        for (const { field, direction } of sortConfig) {
            const schemaField = schema?.fields.find(f => f.name === field);
            const aVal = a.data[field];
            const bVal = b.data[field];

            // Null / undefined / empty string always sorts to end regardless of direction
            const aEmpty = aVal === null || aVal === undefined || aVal === '';
            const bEmpty = bVal === null || bVal === undefined || bVal === '';
            if (aEmpty && bEmpty) continue;
            if (aEmpty) return 1;
            if (bEmpty) return -1;

            let cmp = 0;
            switch (schemaField?.type) {
                case 'number':
                    cmp = (aVal as number) - (bVal as number);
                    break;
                case 'date':
                    cmp = String(aVal).localeCompare(String(bVal));
                    break;
                case 'boolean':
                    cmp = (aVal ? 1 : 0) - (bVal ? 1 : 0);
                    break;
                case 'relation': {
                    const aFirst = Array.isArray(aVal) ? String(aVal[0] ?? '') : String(aVal);
                    const bFirst = Array.isArray(bVal) ? String(bVal[0] ?? '') : String(bVal);
                    cmp = aFirst.localeCompare(bFirst);
                    break;
                }
                default:
                    cmp = String(aVal).localeCompare(String(bVal));
            }

            if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
        }
        return 0;
    });
}, [ledgerEntries, sortConfig, schema]);
```

**Critical**: Spread `[...ledgerEntries]` before `.sort()` — never mutate the original array from the store.

### Virtualizer Update — Use `sortedEntries`

Change these three places in `LedgerTable.tsx`:

```typescript
// 1. virtualizer count
const rowVirtualizer = useVirtualizer({
    count: sortedEntries.length,   // was: ledgerEntries.length
    ...
});

// 2. keyboard handler bounds
const next = Math.min(selectedRow + 1, sortedEntries.length - 1);  // was ledgerEntries.length - 1
const entryToDelete = sortedEntries[selectedRow];                   // was ledgerEntries[selectedRow]

// 3. entry lookup inside virtualizer map
const entry = sortedEntries[virtualRow.index];                      // was ledgerEntries[virtualRow.index]
```

Also update the `selectedEntry` derived value:
```typescript
const selectedEntry = selectedRow >= 0 ? sortedEntries[selectedRow] : null; // was ledgerEntries[selectedRow]
```

And the `highlightEntryId` auto-select effect:
```typescript
useEffect(() => {
    if (highlightEntryId && sortedEntries.length > 0) {
        const index = sortedEntries.findIndex(e => e._id === highlightEntryId);
        if (index >= 0) setSelectedRow(index);
    }
}, [highlightEntryId, sortedEntries]);
```

### Column Header JSX — Sort Indicator + Click Handler

Replace the existing `role="columnheader"` div with:

```tsx
{schema.fields.map((field) => {
    const sortInfo = sortConfig.find(s => s.field === field.name);
    const sortPriority = sortConfig.indexOf(sortInfo!) + 1; // 1-based; 0 when not in config

    return (
        <div
            key={field.name}
            role="columnheader"
            aria-sort={sortInfo
                ? (sortInfo.direction === 'asc' ? 'ascending' : 'descending')
                : 'none'
            }
            onClick={(e) => handleHeaderClick(field.name, e.shiftKey)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleHeaderClick(field.name, e.shiftKey);
                }
            }}
            tabIndex={0}
            style={{ width: getColWidth(field.name), flexShrink: 0, position: 'relative', userSelect: 'none' }}
            className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap overflow-hidden cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 select-none"
        >
            {field.name}
            <span className="ml-1 font-normal normal-case text-zinc-400 dark:text-zinc-500">
                ({field.type})
            </span>
            {sortInfo && (
                <span className="ml-1 text-emerald-500" aria-hidden="true">
                    {sortInfo.direction === 'asc' ? '▲' : '▼'}
                    {sortConfig.length > 1 && (
                        <sup className="text-[10px]">{sortPriority}</sup>
                    )}
                </span>
            )}
            {/* Resize handle */}
            <div
                onMouseDown={(e) => handleResizeMouseDown(e, field.name)}
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize' }}
                aria-hidden="true"
                onClick={(e) => e.stopPropagation()} // prevent triggering sort on resize handle
            />
        </div>
    );
})}
```

### Column Resize — Full Implementation

Add state and refs near the other state declarations in `LedgerTable`:

```typescript
const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
const resizeState = useRef<{ field: string; startX: number; startWidth: number } | null>(null);
const headerScrollRef = useRef<HTMLDivElement>(null);

function getColWidth(fieldName: string): number {
    return columnWidths[fieldName] ?? 150;
}

function handleResizeMouseDown(e: React.MouseEvent, fieldName: string) {
    e.preventDefault();
    resizeState.current = {
        field: fieldName,
        startX: e.clientX,
        startWidth: getColWidth(fieldName),
    };
}
```

Add a single `useEffect` for global mouse tracking (register once on mount):

```typescript
useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
        if (!resizeState.current) return;
        const delta = e.clientX - resizeState.current.startX;
        const newWidth = Math.max(60, resizeState.current.startWidth + delta);
        setColumnWidths(prev => ({ ...prev, [resizeState.current!.field]: newWidth }));
    };

    const onMouseUp = () => {
        resizeState.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };
}, []); // empty deps — stable, registers once
```

### Synchronized Horizontal Scroll — Header + Data

Wrap the existing `<div role="row" className="flex">` (header row) in a scroll-sync wrapper:

```tsx
{/* Header scroll container — scrollLeft driven by data container onScroll */}
<div
    ref={headerScrollRef}
    style={{ overflowX: 'hidden', display: 'flex' }}
>
    <div role="row" style={{ display: 'flex' }}>
        {/* columnheader cells with explicit widths */}
    </div>
</div>
```

Add `onScroll` to the `scrollContainerRef` data div:

```tsx
<div
    ref={scrollContainerRef}
    style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}
    onScroll={() => {
        if (headerScrollRef.current && scrollContainerRef.current) {
            headerScrollRef.current.scrollLeft = scrollContainerRef.current.scrollLeft;
        }
    }}
>
```

The data rows (virtual rows) use explicit widths on each `role="gridcell"`:

```tsx
<div
    key={`${entry._id}-${field.name}`}
    role="gridcell"
    style={{ width: getColWidth(field.name), flexShrink: 0 }}
    className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 overflow-hidden text-ellipsis whitespace-nowrap"
>
```

**Remove** `flex-1 min-w-0` from both header cells and data cells — they now use explicit widths via `style`.

### Data Cell Width — Remove `flex-1 min-w-0`

The old class string on both `role="columnheader"` and `role="gridcell"` was:
```
flex-1 min-w-0 px-4 py-... overflow-hidden text-ellipsis whitespace-nowrap
```

The new approach applies `width` + `flexShrink: 0` via `style`; remove `flex-1 min-w-0` from `className`. Keep `overflow-hidden text-ellipsis whitespace-nowrap`.

### Testing Pattern — `tests/dataLabHeaderSorting.test.tsx`

Follow the exact same mock setup as `tests/dataLabVirtualizedCore.test.tsx`:

```typescript
vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: vi.fn().mockImplementation(({ count, estimateSize }) => ({
        getVirtualItems: () =>
            Array.from({ length: count }, (_, i) => ({
                index: i, key: i, start: i * estimateSize(), size: estimateSize(),
            })),
        getTotalSize: () => count * estimateSize(),
        measureElement: vi.fn(),
        scrollToIndex: vi.fn(),
    })),
}));
```

Use the same `useLedgerStore`, `useProfileStore`, `useUIStore` mocks. Design the test entries so the sort result is deterministic — e.g., text values `'Bravo'`, `'Alpha'`, `'Charlie'` guarantee ascending = `['Alpha', 'Bravo', 'Charlie']`.

### Known Carry-Forward Items from Story 3-7 (Do NOT Fix in This Story)

The following low-priority issues remain open from Story 3-7's code review and are **out of scope** here:

- `[LOW]` `window.confirm()` for soft-delete — replace with Zustand confirm-dialog (deferred to Story 3-9 or later)
- `[LOW]` `deletedEntryIds` useMemo scans all schemas — scope to current schema's relation targets
- `[LOW]` `recentlyCommittedId` flash fires on edit completion as well as new-entry creation
- `[LOW]` Empty state check doesn't account for all-soft-deleted entries
- `[MEDIUM]` `<tr>` inside `<div>` HTML warning from `InlineEntryRow` in edit/add mode — deferred to Story 3-9

### Files to Touch

| File | Change |
|---|---|
| `src/features/ledger/LedgerTable.tsx` | **MODIFIED** — add `sortConfig` state, `sortedEntries` memo, `handleHeaderClick`, `columnWidths` state, resize refs, `getColWidth`, `handleResizeMouseDown`, resize `useEffect`, `headerScrollRef`, update virtualizer to use `sortedEntries`, update column header JSX (sort indicator + aria-sort + resize handle), update data cell widths, add `onScroll` sync |
| `tests/dataLabHeaderSorting.test.tsx` | **NEW** — ≥ 5 tests for sort behavior and resize |

### Files to NOT Touch

- `src/features/ledger/InlineEntryRow.tsx` — no changes needed
- `src/features/ledger/LedgerView.tsx` — no changes needed
- `src/features/ledger/RelationTagChip.tsx` — no changes needed
- `src/features/ledger/BackLinksPanel.tsx` — no changes needed
- `src/stores/useLedgerStore.ts` — sort is a UI concern, no store changes
- `src/stores/useUIStore.ts` — sort is local to `LedgerTable`, not global UI state
- `src/types/ledger.ts` — `SortDirection` / `SortColumn` types can stay local in `LedgerTable.tsx`
- `tests/LedgerTable.test.tsx` — must NOT be modified
- `tests/dataLabVirtualizedCore.test.tsx` — must NOT be modified

### Do NOT Introduce

- `@tanstack/react-table` — this story uses only the existing `@tanstack/react-virtual` virtualizer
- Any server-side sorting, PouchDB index changes, or store mutations
- Any debounce on column resize (live update is correct)
- Any persistence of sort config or column widths to PouchDB or localStorage (UI-only state for this story)
- Any column reordering (drag-to-reorder columns) — that is future work
- Any grouping logic — that is also future (PRD FR17 groups can follow sorting in a later story)

### Pre-existing Test Baseline

From Story 3-7 completion (post code review fixes):

- **Test files:** 64
- **Passing:** 567
- **Skipped:** 1
- **Failures:** 0

This story adds `tests/dataLabHeaderSorting.test.tsx` with ≥ 5 new passing tests. No existing tests should be modified or broken.

### References

- Epic 3 story list: [Source: `_bmad-output/planning-artifacts/epics.md` — "3.8 Data Lab - Header & Custom Sorting: Drag-to-resize columns and multi-column sorting state"]
- FR17 multi-column sort requirement: [Source: `_bmad-output/planning-artifacts/prd.md` — "Users can configure custom sorting hierarchies (e.g., Sort by Date Descending, then by Amount Ascending)"]
- UX sort spec: [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — "Sort: Click column header; indicator shows active sort + direction"]
- ARIA columnheader sort pattern: [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — "role=grid / role=gridcell ARIA pattern"]
- Current LedgerTable structure: [Source: `src/features/ledger/LedgerTable.tsx`]
- virtualizer mock pattern for tests: [Source: `tests/dataLabVirtualizedCore.test.tsx`]
- Story 3-7 scope boundary (sorting deferred to 3-8): [Source: `_bmad-output/implementation-artifacts/3-7-data-lab-tanstack-virtualized-core.md` — "Any sorting logic — that is Story 3-8"]
- Test location rule (non-negotiable): [Source: `docs/project-context.md` — "All test files MUST reside in the `/tests` directory"]
- TypeScript strict mode: [Source: `docs/project-context.md` — "TypeScript Configuration: Strict mode is strictly enforced"]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4.6)

### Debug Log References

### Completion Notes List

- ✅ Task 1: Added `SortDirection` type and `SortColumn` interface to `LedgerTable.tsx`. Added `sortConfig` state and `sortedEntries` useMemo with full multi-key comparator supporting all field types (text/number/date/boolean/relation). Null/empty values sort to end. Replaced all `ledgerEntries` references in virtualizer, keyboard handler, and highlight effect with `sortedEntries`. `selectedRow` resets to -1 in `handleHeaderClick`.
- ✅ Task 2: Updated all `role="columnheader"` divs with `onClick`/`onKeyDown` handlers, `aria-sort` attribute, cursor-pointer/select-none classes, ▲/▼ glyph with superscript priority badge for multi-column sort.
- ✅ Task 3: Added `columnWidths` state, `resizeState` ref, `headerScrollRef` ref, `getColWidth`/`handleResizeMouseDown` functions, window mousemove/mouseup resize useEffect, explicit width styles on header and gridcell elements (removed flex-1 min-w-0), header row wrapped in scroll-sync container, scroll container updated with `overflowX: auto` and `onScroll` sync handler.
- ✅ Task 4: Created `tests/dataLabHeaderSorting.test.tsx` with 6 tests (single-column asc, single-column desc, sort removal/restoration, Shift+click multi-column, ▲ glyph indicator, ▼ glyph indicator).
- ✅ Task 5: `npx tsc --noEmit` → 0 errors. `npx vitest run` → 65 test files passed, 578 tests passed (up from 567 baseline), 1 skipped, 0 failures.

### File List

- `src/features/ledger/LedgerTable.tsx` — MODIFIED: sort state/useMemo, header JSX with sort indicator + aria-sort + resize handle, column resize state/refs/functions/useEffect, scroll sync, sortedEntries virtualizer integration
- `tests/dataLabHeaderSorting.test.tsx` — NEW: 6 tests covering sort behavior and indicators
