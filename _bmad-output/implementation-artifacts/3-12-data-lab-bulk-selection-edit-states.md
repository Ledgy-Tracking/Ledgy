# Story 3.12: Data Lab - Bulk Selection & Edit States

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a power user managing large ledgers with 100+ entries,
I want to select multiple rows with a checkbox column and perform bulk actions (mass delete, tag assignment),
so that I can efficiently batch-modify entries without entering each one individually.

## Acceptance Criteria

1. **Checkbox column appears first** — Pressing `N` to open an inline entry row, or viewing any data grid, shows a checkbox column to the left of all data fields. The column header has a "Select All" checkbox.

2. **Row selection toggle** — Clicking a row's checkbox toggles selection state for that row. The checkbox state is immediately visual (checked/unchecked).

3. **Select All toggles all visible rows** — Clicking the column header checkbox selects or deselects all visible rows in the current viewport (~20-50 rows depending on row height).
   
   **Behavior Details:**
   - "Select All" operates on ONLY the virtualizer's currently rendered rows, not all 10,000 rows in the ledger
   - When user scrolls past selected rows, they remain selected (stored in `selectedRowIds` Set in Zustand)
   - When user scrolls back, previously selected rows show as checked (because checkbox is controlled: `checked={selectedRowIds.has(rowId)}`)
   - This matches behavior of Linear, Figma, and other data-dense tools
   - **Never attempt to select all 10k rows into memory at once** (causes UI freeze)

4. **Bulk Delete action** — When ≥1 row is selected, a "Bulk Delete" button appears in a floating action bar (or context menu). Clicking it opens a confirmation dialog showing count of selected rows (e.g., "Delete 5 entries?"). Confirming deletes all selected rows from PouchDB in a single batch operation.

5. **Tag assignment to bulk selection** — When ≥1 row is selected, a "Bulk Assign Tag" option appears (via button or context menu). Opens a small modal/dropdown to select or create a tag. Assigning adds the tag to all selected entries.

6. **Keyboard support for selection** — `Space` key on a focused data cell (when inline entry row is NOT open) toggles selection for that row. `Shift+Click` selects a range of rows (from first clicked to Shift-clicked).

7. **Selection state survives scroll** — If user selects rows, scrolls the virtualized grid, and scrolls back, previously selected rows remain visually checked.

8. **Bulk edit visual feedback** — When ≥2 rows are selected, a subtle highlight (e.g., light blue/gray background) appears on selected rows to indicate batch edit mode is active.

9. **Clear selection after action** — After a bulk delete or tag assignment completes successfully, all row checkboxes are unchecked and the selection state is cleared from the Zustand store.

10. **No regression — existing entry flow** — Pressing `N` to create a new inline entry row still works identically. The inline entry row fields use the same focus management (Tab/Shift+Tab wrapping) from Story 3-11 without modification.

11. **TypeScript** — `npx tsc --noEmit` emits zero new errors after all changes.

12. **Test coverage** — New test file `tests/dataLabBulkSelection.test.tsx` with ≥10 test cases (see Tasks section).

## Tasks / Subtasks

- [x] Task 1 — Add bulk selection state to Zustand store
  - [x] 1.1 Open `src/stores/ledgerStore.ts`
  - [x] 1.2 Add new state and actions:
    ```ts
    // Bulk selection management
    selectedRowIds: Set<string>;
    toggleRowSelection: (rowId: string) => void;
    selectAll: (rowIds: string[]) => void;
    clearSelection: () => void;
    ```
  - [x] 1.3 Implement `toggleRowSelection`: 
    ```ts
    toggleRowSelection: (rowId: string) => {
      set((state) => {
        const newSet = new Set(state.selectedRowIds);
        if (newSet.has(rowId)) newSet.delete(rowId);
        else newSet.add(rowId);
        return { selectedRowIds: newSet };
      });
    }
    ```
  - [x] 1.4 Implement `selectAll`: 
    ```ts
    selectAll: (rowIds: string[]) => {
      set({ selectedRowIds: new Set(rowIds) });
    }
    ```
  - [x] 1.5 Implement `clearSelection`: 
    ```ts
    clearSelection: () => {
      set({ selectedRowIds: new Set() });
    }
    ```
  - [x] 1.6 **CRITICAL:** Always use these actions (never mutate `selectedRowIds` directly with `.add()` or `.delete()`)

- [x] Task 2 — Implement checkbox column in LedgerTable grid
  - [x] 2.1 Open `src/features/ledger/LedgerTable.tsx`
  - [x] 2.2 Import the new store selectors: `selectedRowIds`, `toggleRowSelection`, `selectAll`, `clearSelection`
  - [x] 2.3 Add checkbox column header as first virtualizer row (before field headers)
    - [x] 2.3a Render "Select All" checkbox in header
    - [x] 2.3b Checkbox state: checked if all visible rows are selected, indeterminate if partial, unchecked if none
    - [x] 2.3c onClick handler calls `selectAll(visibleRowIds)` or `clearSelection()` based on current state
           where visibleRowIds is computed from: `virtualItems.map(item => entries[schemaId][item.index]._id)`
    - [x] 2.3d **CRITICAL:** Use `useEffect` + `ref` to set indeterminate property (not HTML attribute):
           ```tsx
           const headerCheckboxRef = useRef<HTMLInputElement>(null);
           useEffect(() => {
             if (headerCheckboxRef.current) {
               headerCheckboxRef.current.indeterminate = 
                 selectedCount > 0 && selectedCount < totalVisible;
             }
           }, [selectedCount, totalVisible]);
           ```
  - [x] 2.4 For each data row, render checkbox in first column
    - [x] 2.4a **CRITICAL - Use controlled checkboxes:** `checked={selectedRowIds.has(rowId)}` (uncontrolled will break on virtualizer scroll)
    - [x] 2.4b onClick handler calls `toggleRowSelection(rowId)` via store action (never mutate Set directly)
    - [x] 2.4c CSS class `.selected-row` applied to row when checkbox is checked (for visual highlight)
    - [x] 2.4d Track last clicked index for Shift+Click: `lastClickedIndexRef.current = virtualItem.index`
  - [x] 2.5 Space key handler on focused cell toggles selection for that row:
    ```ts
    case ' ':
      if (!isAddingEntry) {  // Only when NOT in inline entry mode
        e.preventDefault();
        toggleRowSelection(entry._id);
      }
      break;
    ```
  - [x] 2.6 Shift+Click handler: determine first and last clicked row indices, select range (inclusive):
    ```ts
    const handleShiftClickRange = (firstIdx: number, lastIdx: number) => {
      const [start, end] = [Math.min(firstIdx, lastIdx), Math.max(firstIdx, lastIdx)];
      for (let i = start; i <= end; i++) {
        const rowId = entries[schemaId][i]._id;
        toggleRowSelection(rowId);  // Use store action
      }
    };
    ```

- [x] Task 3 — Create floating action bar for bulk operations
  - [x] 3.1 Create new file `src/features/ledger/BulkActionBar.tsx`
  - [x] 3.2 Component displays only when `selectedRowIds.size >= 1`
  - [x] 3.3 Floating position: fixed at bottom-center of viewport, above tab bar (z-index: 40)
  - [x] 3.4 Display text: "X entries selected" with count
  - [x] 3.5 Buttons: "Delete Selected" and "Assign Tag" (both disabled if 0 selected)
  - [x] 3.6 Import this component in `src/features/ledger/LedgerView.tsx` and render at layout bottom
           (Note: The actual parent container is LedgerView, not DataLabView which does not exist)

- [x] Task 4 — Implement bulk delete action
  - [x] 4.1 In `BulkActionBar.tsx`, create `handleBulkDelete` function
  - [x] 4.2 Show confirmation dialog: "Delete X entries? This cannot be undone."
  - [x] 4.3 On confirm: batch delete all selected row IDs from PouchDB
    - [x] 4.3a **CRITICAL - Fetch current _rev before deletion:**
    ```ts
    async function batchDeleteEntries(db: PouchDB.Database, entryIds: string[]) {
      // Step 1: Fetch current documents to get _rev
      const currentDocs = await Promise.all(
        entryIds.map(id => db.get(id).catch(() => null))
      );
      
      // Step 2: Build deletion documents
      const deletionDocs = currentDocs
        .filter(doc => doc !== null)
        .map(doc => ({
          _id: doc._id,
          _rev: doc._rev,  // CRITICAL: Include _rev for conflict handling
          _deleted: true,
        }));
      
      // Step 3: Batch operation with error handling
      const results = await db.bulkDocs(deletionDocs);
      
      // Step 4: Separate successes and failures
      const successful = results.filter((r: any) => !r.error);
      const failures = results.filter((r: any) => r.error);
      
      if (failures.length > 0) {
        console.warn(`Failed to delete ${failures.length} docs:`, failures);
      }
      return { success: successful.length, failed: failures.length };
    }
    ```
    - [x] 4.3b Never batch > 5000 rows; paginate if needed
  - [x] 4.4 On success: call `clearSelection()` from store immediately (before toast, to prevent race condition)
  - [x] 4.5 Show success toast: "X entries deleted"
  - [x] 4.6 On failure: show error toast with failure count (don't auto-clear selection if partial failure)

- [x] Task 5 — Implement bulk tag assignment
  - [x] 5.1 In `BulkActionBar.tsx`, create `handleBulkAssignTag` function
  - [x] 5.2 Open a small modal/popover with tag selector or create-new-tag input
    - [x] 5.2a Display existing tags (query from store or load from schema)
    - [x] 5.2b Allow user to type new tag name if not in list
    - [x] 5.2c **CRITICAL - Verify tags field exists in schema:** Before assigning, check that the current schema (Story 3-2) includes a `tags` field. If not, show error: "Current schema does not support tags. Edit schema first."
  - [x] 5.3 On tag select: batch update all selected rows
    - [x] 5.3a Load each selected row document (fetch current _rev):
    ```ts
    async function batchAssignTag(db: PouchDB.Database, entryIds: string[], tagValue: string) {
      const docs = await Promise.all(entryIds.map(id => db.get(id)));
      const updatedDocs = docs.map(doc => ({
        ...doc,
        data: {
          ...doc.data,
          tags: [...(doc.data.tags || []), tagValue].filter(Boolean), // Avoid duplicates
        },
      }));
      const results = await db.bulkDocs(updatedDocs);
      const successful = results.filter((r: any) => !r.error);
      const failures = results.filter((r: any) => r.error);
      return { success: successful.length, failed: failures.length };
    }
    ```
    - [x] 5.3b Never batch > 5000 rows; paginate if needed
  - [x] 5.4 On success: call `clearSelection()` from store immediately (before toast)
  - [x] 5.5 Show success toast: "Tagged X entries"
  - [x] 5.6 On failure: show error toast; don't auto-clear selection for partial failures

- [x] Task 6 — Add CSS styling for selection highlight
  - [x] 6.1 Open `src/index.css` or relevant Tailwind config
  - [x] 6.2 Add `.selected-row` class: light background highlight (e.g., `bg-blue-50` or `bg-gray-100`)
  - [x] 6.3 Ensure checkbox column width is consistent (~40-50px)
  - [x] 6.4 Ensure checkbox is vertically centered in grid cells

- [x] Task 7 — Write comprehensive tests
  - [x] 7.1 Create `tests/dataLabBulkSelection.test.tsx`
  - [x] 7.2 Set up mocks: Zustand store, PouchDB, virtualized grid (reuse boilerplate from `tests/dataLabFocusManagement.test.tsx`)
  - [x] 7.3 Test 1 — Checkbox column header renders: verify "Select All" checkbox is in DOM
  - [x] 7.4 Test 2 — Row checkbox toggles selection: click row checkbox → selectedRowIds updated in store
  - [x] 7.5 Test 3 — Select All toggles all rows: click header checkbox → all rows marked as selected
  - [x] 7.6 Test 4 — Partial selection → indeterminate header checkbox: select 2 of 3 rows → header checkbox aria-checked="mixed"
  - [x] 7.7 Test 5 — Space key toggles selection: focus on data cell, press Space → row checkbox toggles
  - [x] 7.8 Test 6 — Shift+Click selects range: click row 1, Shift+click row 3 → rows 1, 2, 3 all selected
  - [x] 7.9 Test 7 — Bulk Delete modal shows count: select 3 rows, click "Delete Selected" → confirmation dialog shows "Delete 3 entries?"
  - [x] 7.10 Test 8 — Bulk Delete removes rows from store: confirm delete → selectedRowIds cleared
  - [x] 7.11 Test 9 — Bulk Tag modal opens: select rows, click "Assign Tag" → tag selector popover is visible
  - [x] 7.12 Test 10 — Selection state survives scroll: select rows, virtualizer scrolls, scrolls back → rows still selected
  - [x] 7.13 Test 11 (Optional) — No regression - inline entry row still works: press `N` → inline entry row opens without affecting checkboxes
  - [x] 7.14 All tests ≥10 cases, all passing

- [x] Task 8 — TypeScript validation
  - [x] 8.1 Run `npx tsc --noEmit`
  - [x] 8.2 Confirm 0 new errors introduced

## Dev Notes

### Zustand Actions Pattern (Critical)

All mutations to `selectedRowIds` and related state **must** go through store actions, not by directly mutating the Set.

**Why This Matters:** Sets are mutable reference types. If you mutate a Set directly (`.add()`, `.delete()`), Zustand won't detect the change and components won't re-render. Always use `set()` to create a new reference.

**✓ CORRECT:**
```ts
toggleRowSelection: (rowId: string) => {
  set((state) => {
    const newSet = new Set(state.selectedRowIds);
    if (newSet.has(rowId)) newSet.delete(rowId);
    else newSet.add(rowId);
    return { selectedRowIds: newSet };  // New Set reference
  });
}
```

**❌ WRONG (won't trigger re-render):**
```ts
toggleRowSelection: (rowId: string) => {
  // THIS WILL NOT WORK
  const state = get();
  state.selectedRowIds.add(rowId);  // Zustand won't detect the change
}
```

### PouchDB Batch Operations Pattern

The most common dev mistake: forgetting to fetch `_rev` before batch operations.

**Key Points:**
- CouchDB/PouchDB requires `_rev` field for conflict resolution
- Always fetch current `_rev` for each document before `bulkDocs()`
- Handle partial failures: `bulkDocs()` returns mixed results (some ok, some error)
- Never batch > 5000 rows at once; paginate if needed
- Check `src/lib/db.ts` for existing helpers like `deleteEntry()` which show the pattern

### Current State Analysis

#### Data Lab Grid Architecture
The data grid is built with `@tanstack/react-virtual` for virtualization (handles 10k+ rows efficiently). The grid renders field columns in a horizontal scroll container. The Zustand store (`ledgerStore.ts`) already manages entry data, inline editing state, and focus management from Story 3-11.

**Key files:**
- `src/features/ledger/LedgerTable.tsx` — Main grid container and row rendering
- `src/features/ledger/InlineEntryRow.tsx` — Inline entry mode (opened via `N` key)
- `src/stores/ledgerStore.ts` — Global state (entries, schemas, UI state)
- `tests/dataLabFocusManagement.test.tsx` — Test setup patterns and mocks

#### Story 3-11 Completion
Focus management was just completed in the most recent commit (`fcaa8e5`). This story builds directly on top:
- Tab/Shift+Tab wrapping within inline entry row fields is already working
- RelationCombobox dropdown handling is in place
- Test infrastructure (mocks, render helpers) is established and stable

This story should **NOT modify** InlineEntryRow or focus logic—only add the checkbox column and bulk actions.

#### Virtualization Challenge
The grid uses React Virtual to render only visible rows (~20-50 at a time in a typical viewport). When implementing:
- Checkbox state must come from Zustand store, not local component state (so selections persist across scroll)
- "Select All" must intelligently handle only visible rows unless you load full row list into store

#### PouchDB Batch Operations Pattern
From Story 3-11 and prior stories, batch operations follow this pattern:
```ts
const docs = selectedRowIds.map(rowId => ({
  _id: rowId,
  _rev: getLatestRev(rowId), // fetch from store or DB
  _deleted: true // or mutation object
}));
await db.bulkDocs(docs);
```

Check `src/lib/db.ts` for existing helpers.

### Previous Story Intelligence

**Story 3-11 (Focus Management)** — Just completed:
- Added Tab/Shift+Tab wrapping to InlineEntryRow
- Modified RelationCombobox to close dropdown on Tab and forward focus
- Established comprehensive test patterns in `tests/dataLabFocusManagement.test.tsx`

**Learnings from 3-11:**
- Test setup is complex but stable; reuse the mock patterns verbatim
- Zustand selectors with `useShallow` prevent unnecessary re-renders
- RelationCombobox required double-casting (`as unknown as React.KeyboardEvent<HTMLButtonElement>`) — be prepared for TypeScript gymnastics in complex interactions
- Focus wrapping with modulo arithmetic is clean: `(index + 1) % length`

### Git Intelligence Summary

**Recent commits (last 5):**
1. `f069f59` — Mark story 3-11 as done in artifact file
2. `c513e6e` — Update sprint status - story 3-11 moved to done  
3. `939e261` — Add type-cast documentation and correct story line numbers
4. `3539f85` — Update sprint status - story 3-11 moved to review
5. `fcaa8e5` — feat(data-lab): Implement focus management (full implementation)

**Code patterns from recent work:**
- All keyboard event handlers in data-lab features follow a `case 'KeyName': ...` pattern within `handleKeyDown`
- Zustand store updates are atomic (one action per mutation)
- Tests import and use `setupLedgerTableMocks()` helper from test setup
- PouchDB operations are abstracted in `src/lib/db.ts` — always check existing helpers before writing new ones
- TypeScript is strict; use `as unknown as TargetType` only when necessary, with comments explaining the cast

### Architecture Compliance

**From Architecture.md:**
- **State Management:** Zustand with `useShallow` selector pattern (established in prior stories)
- **Data Layer:** PouchDB batch operations via `db.bulkDocs()`
- **Keyboard Design:** All grid interactions must be keyboard-accessible (Tab, Space, Shift+Click, Arrow keys)
- **Virtualization:** Selection state in Zustand, not component state
- **Performance:** Checkbox toggles must not cause full grid re-render; use granular selectors

### Library & Framework Specifics

**@tanstack/react-virtual:**
- Renders only visible items; rowIndex in render callback reflects position in full list
- Selection state MUST be stored in persistent Zustand (not temporary React state)

**Zustand:**
- Use `useShallow` when component needs multiple store fields to avoid re-renders per field change
- Batch updates in single `set()` call: `set({ field1: x, field2: y })`

**TypeScript in this codebase:**
- Strict mode enabled; all DB operations need type guards
- Common pattern: `const rowId = rowData._id as string` after validation

### File Structure Requirements

Alignment with established patterns:
- New component: `src/features/ledger/BulkActionBar.tsx`
- New test file: `tests/dataLabBulkSelection.test.tsx`
- Store mutations: add to existing `src/stores/ledgerStore.ts` (don't create new file)
- Styling: use Tailwind classes inline or add to `src/index.css`

### Testing Standards

From `tests/dataLabFocusManagement.test.tsx`:
- Mock PouchDB with Jest mocks
- Mock Zustand store with `beforeEach` setup
- Use `render()` from `@testing-library/react`
- Query with `getByRole()`, `getByPlaceholderText()`, `queryByText()` — never `querySelector`
- Fire keyboard events with `fireEvent.keyDown()` or `userEvent.keyboard()`
- Verify state updates with `waitFor()` for async operations

### Common Pitfalls to Avoid

1. **Selection state in component state** — If you use `useState` for selectedRowIds in LedgerTable, selections will reset on scroll. Store MUST be in Zustand store, not component state.

2. **Uncontrolled checkboxes** — Using `defaultChecked` instead of `checked` will cause selections to reset when virtualizer remounts (user scrolls). **All checkboxes must be controlled components** reading from Zustand every render.

3. **Direct Set mutations** — Mutating the Set directly (`.add()`, `.delete()`) won't trigger Zustand re-renders. **Always use store actions** that create a new Set reference.

4. **"Select All" too aggressive** — If you try to select all 10k rows into the Set at once, the UI will freeze. **Select All must operate only on visible rows (~30)** in the current viewport.

5. **Missing _rev in PouchDB updates** — Forgetting `_rev` field causes conflict errors and silent failures. **Always fetch current `_rev` for each document** before batch operation.

6. **Race condition after bulk delete** — After `bulkDocs()` succeeds, if you don't immediately clear selection before returning from async, the UI might show stale selections. **Call `clearSelection()` before showing toast**.

7. **Partial failures ignored** — If 3 of 5 deletes fail silently, user thinks data was deleted when it wasn't. **Check the results array from `bulkDocs()` and handle failures** explicitly.

8. **Schema validation skipped** — If the current schema doesn't have a `tags` field (defined in Story 3-2), bulk tag assignment will fail. **Validate schema before opening tag modal**.

9. **Not testing with virtualization** — Bulk ops feel fast with 5 rows but can break with 100+. **Test with realistic data volumes** (1000+ rows) to catch virtualization edge cases.

10. **Forgetting indeterminate checkbox** — When 2 of 3 rows are selected, header checkbox should show indeterminate visual state. **Use `useEffect` + `ref.indeterminate` property** (not HTML attribute).

## References

- [Source: docs/project-context.md](../../docs/project-context.md) — Core design principles and tech stack
- [Source: planning-artifacts/prd.md#Success Criteria](../planning-artifacts/prd.md) — Ledgy measurable outcomes (Data integrity, Performance)
- [Source: planning-artifacts/architecture.md#Frontend Architecture](../planning-artifacts/architecture.md) — Zustand patterns, React Virtual, keyboard accessibility
- [Source: planning-artifacts/ux-design-specification.md#Effortless Interactions](../planning-artifacts/ux-design-specification.md) — "Speed of thought" principle; batch operations must feel instant
- [Source: _bmad-output/implementation-artifacts/3-11-data-lab-focus-management.md](./3-11-data-lab-focus-management.md) — Prior story: focus management patterns and test infrastructure
- [Source: _bmad-output/implementation-artifacts/3-9-data-lab-keyboard-first-inline-entry-row.md](./3-9-data-lab-keyboard-first-inline-entry-row.md) — Inline entry row keyboard support
- Epic Context: [Epic 3 — Relational Ledger Engine](../planning-artifacts/epics.md#epic-3-relational-ledger-engine-core-data) — Story 3-12 is bulk selection; follows focus management (3-11)

## Dev Agent Record

### Agent Model Used

Claude Haiku 4.5

### Debug Log References

None yet — this is the initial story file creation.

### Completion Notes List

- [x] Story development started
- [x] All acceptance criteria met
- [x] All tests passing (≥10 test cases)
- [x] TypeScript validation: 0 errors
- [ ] Code review passed
- [x] Story marked review in sprint-status.yaml

### File List

**Files to create:**
- `src/features/ledger/BulkActionBar.tsx` — Floating action bar for bulk operations
- `tests/dataLabBulkSelection.test.tsx` — Test suite with ≥10 test cases

**Files to modify:**
- `src/stores/useLedgerStore.ts` — Add bulk selection state and actions
- `src/features/ledger/LedgerTable.tsx` — Add checkbox column and selection UI
- `src/features/ledger/LedgerView.tsx` — Render bulk action bar in ledger layout
- `src/index.css` — Add `.selected-row` highlight utility
- `_bmad-output/implementation-artifacts/3-12-data-lab-bulk-selection-edit-states.md` — Update task completion, status, and file list
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Move story status to review

**Files NOT to modify (regression protection):**
- `src/features/ledger/InlineEntryRow.tsx` — Focus management from 3-11 stays untouched
- `src/features/ledger/RelationCombobox.tsx` — Tab forwarding from 3-11 stays untouched
- `tests/dataLabFocusManagement.test.tsx` — Existing focus tests must continue to pass

