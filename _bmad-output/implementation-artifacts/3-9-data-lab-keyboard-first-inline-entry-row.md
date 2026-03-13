# Story 3.9: Data Lab - Keyboard-First Inline Entry Row

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a power user entering data into a ledger,
I want to press `N` and immediately start typing in a new inline row at the top of the table,
so that I can log entries in under 3 seconds without leaving the keyboard.

## Acceptance Criteria

1. **N / + Trigger** — Pressing `N` (or clicking the existing "Add Entry (N)" button) while no input has focus opens the Inline Entry Row at the top of the scrollable grid body (above virtual rows). Pressing `N` again while the row is already open must NOT open a second row.

2. **Keyboard-Only Flow** — Inside the inline row, `Tab` / `Shift+Tab` moves focus between field inputs in schema order. `Enter` on any non-last field moves focus to the next field. `Enter` on the last field submits the form. `Escape` cancels and discards the row, restoring focus to the grid.

3. **Validation & Error Display** — Required fields show an inline `Required` error message beneath the field (red text) when submit is attempted with an empty value. The row stays open until the user corrects errors or presses `Escape`.

4. **Commit & Flash Animation** — On successful save, the inline row closes, the new entry appears in the virtual list, and that row flashes the `animate-slide-down-row` + emerald ring highlight for 2 seconds (matching the existing `recentlyCommittedId` pattern in `LedgerTable.tsx`).

5. **`<tr>` HTML Nesting Fix** — The `<InlineEntryRow>` component must not render a raw `<tr>` inside a `<div>` wrapper. In add/edit mode the row is already rendered inside a `<div role="row">` in `LedgerTable.tsx`; therefore `InlineEntryRow` must render `<div role="row">` + `<div role="gridcell">` elements (not `<TableRow>` / `<TableCell>` which produce `<tr>` / `<td>`). Confirm no HTML validation console warning after change.

6. **Edit Mode Parity** — The double-click / `Enter` edit flow for existing rows (already wired in `LedgerTable.tsx`) continues to use `InlineEntryRow` with the same ARIA-safe `<div role="row">` markup after the AC-5 fix.

7. **Test Coverage** — A new test file `tests/dataLabKeyboardInlineEntry.test.tsx` must pass with ≥ 8 test cases covering: N-key trigger, duplicate-N guard, Tab/Enter navigation, Escape cancel, required-field validation, commit flash, the `<div role="row">` render output, and focus-first-field-on-open. Existing tests (`tests/InlineEntryRow.test.tsx`, `tests/LedgerTable.test.tsx`) must continue to pass without modification.

8. **TypeScript** — `npx tsc --noEmit` must emit zero new errors after all changes.

9. **Performance** — N key to visible inline row must render within a single React commit (no async gap). No setTimeout or layout reflow on the critical path to open.

## Tasks / Subtasks

- [ ] Task 1 — Fix `<tr>`-in-`<div>` HTML nesting in `InlineEntryRow` (AC: #5, #6)
  - [ ] 1.1 Replace `<TableRow>` with `<div role="row" className="...existing-bg-classes...">` in `InlineEntryRow.tsx`
  - [ ] 1.2 Replace each `<TableCell>` with `<div role="gridcell" className="...existing-cell-classes...">` — preserve all Tailwind classes verbatim
  - [ ] 1.3 Replace the action buttons cell `<TableCell>` with a matching `<div role="gridcell">` with `style={{ width: 150, flexShrink: 0 }}`
  - [ ] 1.4 Remove the `TableRow` and `TableCell` imports from `InlineEntryRow.tsx` (no longer used)
  - [ ] 1.5 Verify in browser / test: no `<tr>` is produced; no React console warning about invalid DOM nesting

- [ ] Task 2 — Harden N-key guard against double-open (AC: #1)
  - [ ] 2.1 In `LedgerTable.tsx` keyboard handler (`useEffect` with `window.addEventListener('keydown', ...)`), confirm that the `N`/`n` branch already calls `setIsAddingEntry(true)` — it does — which is idempotent (setting true when already true). Add an explicit guard: `if (isAddingEntry) return;` before `setIsAddingEntry(true)` using a stable ref (pattern already established with `selectedRowRef`). Create `isAddingEntryRef` mirroring `isAddingEntry` so the closure reads the latest value without adding it to the effect dependency array.
  - [ ] 2.2 Confirm clicking "Add Entry (N)" when the row is already open also does nothing (the button calls `setIsAddingEntry(true)` which is already no-op due to React state batching, but update the `onClick` to `() => { if (!isAddingEntry) setIsAddingEntry(true); }` for explicitness).

- [ ] Task 3 — First-field auto-focus on open (AC: #2, #9)
  - [ ] 3.1 The existing `useEffect(() => { inputRefs.current[0]?.focus(); }, [])` in `InlineEntryRow.tsx` already fires on mount — verify it still works after the `<div>` refactor in Task 1.
  - [ ] 3.2 Write a test asserting `document.activeElement` is the first field input immediately after the inline row mounts.

- [ ] Task 4 — Escape restores focus to grid (AC: #2)
  - [ ] 4.1 In `InlineEntryRow.tsx`, the `Escape` handler calls `onCancel()`. After `onCancel()`, `LedgerTable` sets `isAddingEntry = false` which unmounts the row. Add a `focusGridRef` prop OR use a callback pattern: `onCancel` in `LedgerTable.tsx` should call `scrollContainerRef.current?.focus()` after `setIsAddingEntry(false)` to return keyboard focus to the scrollable grid.
  - [ ] 4.2 Ensure `scrollContainerRef` has `tabIndex={-1}` so it can programmatically receive focus. (Check current markup — add it if absent.)

- [ ] Task 5 — Update test file for inline entry keyboard flows (AC: #7)
  - [ ] 5.1 Create `tests/dataLabKeyboardInlineEntry.test.tsx`
  - [ ] 5.2 Write test: N key opens inline row (`fireEvent.keyDown(window, { key: 'n' })` → `Save` button visible)
  - [ ] 5.3 Write test: second N key press does NOT open a duplicate row (count of `Save` buttons still 1)
  - [ ] 5.4 Write test: Tab navigates between fields (focus moves from field 0 to field 1)
  - [ ] 5.5 Write test: Enter on last field submits form and calls `createEntry`
  - [ ] 5.6 Write test: Escape cancels and removes the inline row from DOM
  - [ ] 5.7 Write test: Required-field validation shows `Required` error on empty submit
  - [ ] 5.8 Write test: InlineEntryRow renders `div[role="row"]` not `tr` (use `container.querySelector`)
  - [ ] 5.9 Write test: first input is focused on mount (`document.activeElement`)
  - [ ] 5.10 Run full test suite — verify 65 files, ≥ 590 tests (582 baseline + new), 0 failures

- [ ] Task 6 — TypeScript validation (AC: #8)
  - [ ] 6.1 Run `npx tsc --noEmit` — fix any type errors introduced by the `<div>` refactor (e.g., `className` on `<div>` vs. Shadcn props, removed import types)
  - [ ] 6.2 Ensure `FieldInput` `ref` typing still works; `React.forwardRef` with `HTMLInputElement | HTMLSelectElement | HTMLButtonElement` union is unchanged

- [ ] Task 7 — Commit flash for new entries (verify parity) (AC: #4)
  - [ ] 7.1 Confirm `onComplete` callback in `LedgerTable.tsx` (add mode) already sets `recentlyCommittedId` and clears after 2 s — it does (lines 369–375). No code change needed; cover with a test.
  - [ ] 7.2 Write a test in `dataLabKeyboardInlineEntry.test.tsx` asserting that after successful save the committed entry row receives `animate-slide-down-row` class within the 2s window (mock `setTimeout`/`vi.useFakeTimers`).

## Dev Notes

### Critical Fix — HTML Nesting

`InlineEntryRow.tsx` currently renders:
```tsx
// BEFORE (produces <tr> inside <div> → invalid HTML):
return (
  <TableRow className="bg-emerald-50 ...">  // renders <tr>
    <TableCell ...>...</TableCell>           // renders <td>
  </TableRow>
);
```

`LedgerTable.tsx` hosts it inside:
```tsx
// LedgerTable.tsx — add mode (line 365):
<div>
  <InlineEntryRow ... />   // <-- div wrapping a tr = invalid
</div>

// LedgerTable.tsx — edit mode (line 456):
<div role="row" ...>
  <InlineEntryRow ... />   // <-- div[role=row] wrapping a tr = invalid + confusing ARIA
</div>
```

**Fix**: Replace the root element in `InlineEntryRow.tsx` from `<TableRow>` to `<div role="row" className="flex ...">`. Each field cell becomes `<div role="gridcell" style={{ width: ..., flexShrink: 0 }} className="p-2 relative border-r ...">`. This matches the existing virtualizer row structure in `LedgerTable.tsx`.

After the fix the add-mode wrapper `<div>` in `LedgerTable.tsx` at line 365 can be removed (or kept — it no longer causes a nesting error), but the edit-mode `<div role="row">` wrapper at line 456 will now contain a `<div role="row">` child — which is also semantically odd. For edit mode, `InlineEntryRow` should fill the parent `<div role="row">` cells directly. Consider passing a `mode="edit"` prop that omits the outer `role="row"` wrapper and renders only the gridcell `<div>`s — **OR** keep the outer role="row" but suppress it in edit context with `role="presentation"` on the `InlineEntryRow` root. Simplest correct approach: always render `role="row"` on the `InlineEntryRow` root div; in edit mode, remove the `role="row"` from the parent `<div>` in `LedgerTable.tsx` (line ~420–430). This gives one `role="row"` per conceptual row regardless of mode.

### Architecture Guardrails

- **No local `useState` for async operations** — all async errors surface via try/catch and local `errors` state inside `InlineEntryRow` (already the pattern; preserve it).
- **Stable keyboard handler refs** — the N-key handler lives in a `useEffect` with an empty-ish dependency array; mutable values are read through refs (`selectedRowRef`, `pendingDeleteRef`). Add `isAddingEntryRef` following the same pattern for the duplicate-open guard.
- **No `useCallback` needed** — `onCancel`/`onComplete` are inline arrow functions passed from `LedgerTable`; the `InlineEntryRow` mounts/unmounts on each open/close so referential stability doesn't matter here.
- **Do NOT touch sort/resize state** — `sortConfig`, `columnWidths`, `resizeState` are unrelated and must not be disturbed.
- **Column widths in inline row** — The `InlineEntryRow` fields must respect `getColWidth(field.name)` from `LedgerTable` parent. Currently the component doesn't receive widths — this is intentional (the inline row has its own natural layout). Keep this as-is; the inline row is a transient overlay, not a data row.

### Type Definitions

No new types required. Existing types are sufficient:
- `InlineEntryRowProps` — unchanged (`schema`, `entry?`, `onCancel`, `onComplete`)
- `FieldInputProps` — unchanged
- `LedgerSchema`, `SchemaField`, `LedgerEntry` — from `../../types/ledger`

### Implementation Patterns

**Replacing `<TableRow>` with `<div role="row">`:**
```tsx
// AFTER:
return (
  <div
    role="row"
    className="flex bg-emerald-50 dark:bg-emerald-900/10 animate-in slide-in-from-top-2 duration-150"
  >
    {schema.fields.map((field, index) => (
      <div
        key={field.name}
        role="gridcell"
        className="p-2 relative border-r border-zinc-200 dark:border-zinc-800 last:border-r-0"
        style={{ width: 150, flexShrink: 0 }}
      >
        <FieldInput ... />
      </div>
    ))}
    <div role="gridcell" className="p-2" style={{ width: 150, flexShrink: 0 }}>
      {/* Save/Cancel buttons */}
    </div>
  </div>
);
```

**isAddingEntryRef for N-key guard (in `LedgerTable.tsx`):**
```tsx
// Add alongside the other stable refs (e.g. near line 36):
const isAddingEntryRef = useRef(isAddingEntry);
isAddingEntryRef.current = isAddingEntry;

// In keyboard handler (near line 153):
if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    if (!isAddingEntryRef.current) {
        setIsAddingEntry(true);
    }
}
```

**Escape → restore grid focus (in `LedgerTable.tsx`):**
```tsx
// scrollContainerRef div should have tabIndex={-1}:
<div
  ref={scrollContainerRef}
  tabIndex={-1}
  style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}
  ...
>

// onCancel callback:
onCancel={() => {
  setIsAddingEntry(false);
  scrollContainerRef.current?.focus();
}}
```

### Testing Pattern

Mock `@tanstack/react-virtual` the same way as in `tests/LedgerTable.test.tsx` and `tests/dataLabVirtualizedCore.test.tsx`:
```tsx
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

Mock `useLedgerStore`, `useProfileStore`, `useUIStore` per `tests/LedgerTable.test.tsx` pattern.

Use `vi.useFakeTimers()` + `vi.runAllTimers()` for commit-flash timer tests.

Render `LedgerTable` (not `InlineEntryRow` directly) for N-key integration tests, since the keyboard handler lives in `LedgerTable`.

For the `role="row"` DOM assertion:
```tsx
const { container } = render(
  <table><tbody>
    <InlineEntryRow schema={mockSchema} onCancel={vi.fn()} onComplete={vi.fn()} />
  </tbody></table>
);
expect(container.querySelector('tr')).toBeNull();
expect(container.querySelector('[role="row"]')).toBeInTheDocument();
```
*(Note: wrap in `<table><tbody>` for existing tests; the new ARIA-safe version renders a `<div>` so the wrapper is irrelevant — but keep it for backward compat with `InlineEntryRow.test.tsx` which already uses this wrapper.)*

### Files to Touch

| File | Change |
|---|---|
| `src/features/ledger/InlineEntryRow.tsx` | Replace `<TableRow>/<TableCell>` with `<div role="row">/<div role="gridcell">` (AC #5); remove unused imports |
| `src/features/ledger/LedgerTable.tsx` | Add `isAddingEntryRef`; update N-key guard; add `tabIndex={-1}` to `scrollContainerRef` div; update `onCancel` to restore focus; remove `role="row"` from edit-mode wrapper div (now on `InlineEntryRow` root) |
| `tests/dataLabKeyboardInlineEntry.test.tsx` | **Create new** — ≥ 8 test cases (see Tasks 5.2–5.9 + 7.2) |

### Files to NOT Touch

| File | Reason |
|---|---|
| `tests/InlineEntryRow.test.tsx` | Must continue to pass as-is; the outer `<table><tbody>` wrapper means `<div role="row">` renders fine there too |
| `tests/LedgerTable.test.tsx` | Existing N-key test (`fireEvent.keyDown(window, { key: 'n' })`) must pass unchanged |
| `src/stores/useLedgerStore.ts` | No store changes needed for this story |
| `src/stores/useUIStore.ts` | No new UI state needed (confirm dialog replacement deferred to a dedicated story) |
| `src/components/Inspector/EntryInspector.tsx` | `window.confirm` replacement deferred |
| `src/features/projects/ProjectDashboard.tsx` | `window.confirm` replacement deferred |
| Any sort/resize logic in `LedgerTable.tsx` | Out of scope — do not touch `sortConfig`, `columnWidths`, `resizeState` |

### Do-Not-Introduce List

- ❌ No new Zustand store slices for inline row state — local `useState` in `LedgerTable` is correct
- ❌ No `window.confirm` calls — existing ones are deferred; don't add new ones
- ❌ No `<tr>` or `<td>` inside the `InlineEntryRow` root — the entire point of this story
- ❌ No `useCallback` / `useMemo` around `onCancel`/`onComplete` — not needed; adds noise
- ❌ No animation library additions — `animate-in slide-in-from-top-2` from Tailwind CSS Animate is already configured
- ❌ No column-width synchronisation between `InlineEntryRow` fields and data rows — deliberate; the inline row is a transient overlay

### Carry-Forward Items (Deferred from Story 3-8)

| Item | Priority | Status |
|---|---|---|
| Replace `window.confirm()` in `EntryInspector.tsx` with Zustand confirm-dialog | MEDIUM | Deferred — not scoped to 3-9 |
| Replace `window.confirm()` in `ProjectDashboard.tsx` with Zustand confirm-dialog | LOW | Deferred — not scoped to 3-9 |

These remain as open items to address in a future story (3-11 or a dedicated cleanup story).

### Project Structure Notes

- All test files live in `/tests` (not co-located with source) — **non-negotiable** per `docs/project-context.md`
- New test file: `tests/dataLabKeyboardInlineEntry.test.tsx` — follows naming convention of `dataLabVirtualizedCore.test.tsx` and `dataLabHeaderSorting.test.tsx`
- TypeScript strict mode: `tsconfig.json` has `"strict": true` — all new code must satisfy this
- No barrel exports (`index.ts`) — import directly from source files

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3] — Story 3.9: "The `N` hotkey listener spawning the top row for <50ms rapid entry"
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Key Component Specifications] — Inline Entry Row: "Tab/Enter/Escape flow; appears at table top"; Keyboard: `N` new entry
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Flow Optimisation Principles] — "daily entry must reach saved state in ≤ 3 steps"
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns] — Commit flash: "Entry saved → Toast (bottom-right) Emerald 2s auto-dismiss"
- [Source: _bmad-output/implementation-artifacts/3-8-data-lab-header-custom-sorting.md#Carry-Forward Items] — `<tr>` inside `<div>` HTML warning deferred to Story 3-9; `window.confirm` deferred
- [Source: src/features/ledger/LedgerTable.tsx#144-186] — Existing N-key handler + `isAddingEntry` state
- [Source: src/features/ledger/InlineEntryRow.tsx#124-168] — Current `<TableRow>/<TableCell>` render causing nesting warning
- [Source: src/features/ledger/LedgerTable.tsx#364-378] — Add-mode `<div><InlineEntryRow /></div>` wrapper
- [Source: src/features/ledger/LedgerTable.tsx#455-464] — Edit-mode `<div role="row"><InlineEntryRow /></div>` wrapper
- [Source: tests/LedgerTable.test.tsx#118-138] — Existing N-key and duplicate-N tests (must not regress)
- [Source: tests/InlineEntryRow.test.tsx] — Existing InlineEntryRow unit tests (must not regress)
- [Source: docs/project-context.md] — Test co-location rule, TypeScript strict, Zustand patterns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4.6

### Debug Log References

### Completion Notes List

### File List
