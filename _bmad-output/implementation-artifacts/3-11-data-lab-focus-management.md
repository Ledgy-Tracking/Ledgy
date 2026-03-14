# Story 3.11: Data Lab - Focus Management

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a power user entering many entries in rapid succession,
I want Tab, Shift+Tab, Enter, and Escape to keep focus locked within the inline entry row's fields,
so that I can navigate every cell with the keyboard alone without accidentally tabbing outside the grid.

## Acceptance Criteria

1. **Tab advances to next cell** — Pressing `Tab` in any field of the inline entry row moves focus to the immediately next field cell. The `Save` and `Cancel` buttons are excluded from the Tab cycle (they are reachable via mouse click only during inline entry).

2. **Tab on last cell wraps to first** — Pressing `Tab` on the last field cell wraps focus back to the first field cell, keeping focus locked within the row.

3. **Shift+Tab moves to previous cell** — Pressing `Shift+Tab` in any field cell moves focus to the immediately preceding field cell.

4. **Shift+Tab on first cell wraps to last** — Pressing `Shift+Tab` on the first field cell wraps focus to the last field cell.

5. **Enter advances or submits (unchanged)** — `Enter` on a non-last field moves focus to the next field. `Enter` on the last field submits the form. This is regression-protected existing behavior.

6. **Escape cancels (unchanged)** — `Escape` dismisses the inline entry row and returns focus to the scroll container. This is regression-protected existing behavior.

7. **RelationCombobox closed — Tab passes through** — When a `RelationCombobox` is the currently focused field and its dropdown is **closed**, `Tab` and `Shift+Tab` advance correctly to the next or previous field respectively (same as text/number/date fields).

8. **RelationCombobox open — Tab closes and advances** — When a `RelationCombobox` dropdown is **open** (focus is on the search `<input>` inside the dropdown), pressing `Tab` closes the dropdown and moves focus to the next field in the row. Pressing `Shift+Tab` closes the dropdown and moves focus to the previous field. The browser must not Tab out of the row to an element outside.

9. **No Regression — existing tests** — All 9 tests in `tests/dataLabKeyboardInlineEntry.test.tsx` continue to pass without modification.

10. **Test Coverage** — A new test file `tests/dataLabFocusManagement.test.tsx` must pass with ≥ 8 test cases (see Tasks section).

11. **TypeScript** — `npx tsc --noEmit` emits zero new errors after all changes.

## Tasks / Subtasks

- [ ] Task 1 — Intercept Tab and Shift+Tab in `InlineEntryRow.handleKeyDown` (AC: #1, #2, #3, #4)
  - [ ] 1.1 In `src/features/ledger/InlineEntryRow.tsx`, locate the `handleKeyDown` function (around line 61)
  - [ ] 1.2 Replace `case 'Tab': // Natural tab behavior break;` with explicit wrapping logic:
    ```ts
    case 'Tab':
        e.preventDefault();
        if (!e.shiftKey) {
            // Forward Tab → next field (wrapping)
            inputRefs.current[(fieldIndex + 1) % schema.fields.length]?.focus();
        } else {
            // Shift+Tab → previous field (wrapping)
            inputRefs.current[
                (fieldIndex - 1 + schema.fields.length) % schema.fields.length
            ]?.focus();
        }
        break;
    ```
  - [ ] 1.3 Verify the existing `Enter` and `Escape` cases are unchanged

- [ ] Task 2 — Handle Tab when `RelationCombobox` dropdown is open (AC: #8)
  - [ ] 2.1 In `src/features/ledger/RelationCombobox.tsx`, locate the search `<input>` JSX block (around line 175)
  - [ ] 2.2 Change the `onKeyDown` handler of the search input from `onKeyDown={handleKeyDown}` to an inline function that intercepts Tab before delegating to the internal handler:
    ```tsx
    onKeyDown={(e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            setIsOpen(false);
            setSearchTerm('');
            setHighlightedIndex(-1);
            // Forward Tab/Shift+Tab to parent row's field navigator
            externalKeyDown?.(e as unknown as React.KeyboardEvent<HTMLButtonElement>);
            return;
        }
        handleKeyDown(e);
    }}
    ```
  - [ ] 2.3 Confirm that `externalKeyDown` is already in scope inside the component body (it is — it's destructured from props at line 62 as `onKeyDown: externalKeyDown`)
  - [ ] 2.4 Verify the `ArrowUp` / `ArrowDown` / `Enter` / `Escape` cases inside the original `handleKeyDown` (lines ~131–151) are untouched and still delegate correctly

- [ ] Task 3 — Write new test file (AC: #10)
  - [ ] 3.1 Create `tests/dataLabFocusManagement.test.tsx`
  - [ ] 3.2 Set up the same Zustand/virtualizer mocks as `tests/dataLabKeyboardInlineEntry.test.tsx` (copy the `setupLedgerTableMocks` helper, `mockSchema`, and `mockEntry` boilerplate; add a `mockSchemaWithRelation` that includes one text field followed by one relation field)
  - [ ] 3.3 **Test 1 — Tab on first field advances to second field**: render `LedgerTable`, press `N` to open inline row, focus first input, fire `Tab` keydown on it → verify second input (`getByPlaceholderText(/enter amount/i)`) is `document.activeElement`
  - [ ] 3.4 **Test 2 — Tab on last field wraps to first field**: open inline row with 2-field `mockSchema`, focus last field (`Amount`), fire `Tab` → verify first field (`Name`) is `document.activeElement`
  - [ ] 3.5 **Test 3 — Shift+Tab on last field moves to first**: focus `Amount` input, fire `{ key: 'Tab', shiftKey: true }` → verify `Name` input is `document.activeElement`
  - [ ] 3.6 **Test 4 — Shift+Tab on first field wraps to last**: open inline row, focus first input (`Name`), fire `{ key: 'Tab', shiftKey: true }` → verify last field (`Amount`) is `document.activeElement`
  - [ ] 3.7 **Test 5 — Tab does NOT reach Save button**: open inline row with 2-field schema, Tab twice from first field → focus should be on first field again (wrapped), NOT on the Save button. Verify `screen.getByLabelText('Save entry')` (or `getByRole('button', { name: /save/i })`) is NOT `document.activeElement`.
  - [ ] 3.8 **Test 6 — Escape closes inline row (regression)**: open inline row, fire `Escape` on first input → `queryByText('Save')` is null
  - [ ] 3.9 **Test 7 — Enter on non-last field moves to next (regression)**: open inline row, focus `Name` input, fire `Enter` → `Amount` input is `document.activeElement`
  - [ ] 3.10 **Test 8 — RelationCombobox trigger Tab closes dropdown and advances**: render `LedgerTable` with `mockSchemaWithRelation` (fields: `Name` text, then `Target` relation); open inline row; Tab from `Name` to `Target` combobox trigger; fire click on trigger to open dropdown; search input should be focused; fire `Tab` on search input → dropdown should be gone (combobox `aria-expanded` should be false or the search input should not be in DOM); focus should be on whatever comes next (or wrapped back to `Name`)

- [ ] Task 4 — TypeScript validation (AC: #11)
  - [ ] 4.1 Run `npx tsc --noEmit` — confirm 0 new errors
  - [ ] 4.2 Confirm the `as unknown as React.KeyboardEvent<HTMLButtonElement>` cast in RelationCombobox does not introduce a type error (it uses double-cast and is intentional)

## Dev Notes

### Current State Analysis

#### `InlineEntryRow.tsx` — Tab is currently a no-op
In the existing `handleKeyDown` (line 61–81):
```ts
case 'Tab':
    // Natural tab behavior
    break;
```
Tab currently falls through to the browser's default behavior. After the inline row's fields, the browser would Tab to the `Save` button, then `Cancel`, then to whatever focusable element comes next in the DOM outside the row. This breaks the keyboard-first workflow.

The `inputRefs` array is already set up correctly:
```ts
const inputRefs = useRef<(HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null)[]>([]);
```
It is populated via `ref={el => { inputRefs.current[index] = el; }}` on each `FieldInput`. The modulo wrapping pattern (`(fieldIndex + 1) % schema.fields.length`) is safe: for a single-field schema, Tab stays on the same field.

#### `RelationCombobox.tsx` — Tab inside open dropdown escapes the row
When the dropdown is open, focus is on the search `<input>` at line 175:
```tsx
<input
    ref={inputRef}
    ...
    onKeyDown={handleKeyDown}
```
The internal `handleKeyDown` only handles `ArrowDown`, `ArrowUp`, `Enter`, `Escape`. Pressing `Tab` has default browser behavior — it skips the `<li>` items (no `tabIndex`) and focuses the next tabbable element after the dropdown, which is likely outside the inline row entirely.

The `externalKeyDown` prop is destructured at line 62:
```ts
onKeyDown: externalKeyDown,
```
And currently applied only to the trigger button when closed:
```tsx
onKeyDown={!isOpen ? externalKeyDown : undefined}
```
The fix adds a Tab/Shift+Tab intercept on the search input that calls `externalKeyDown` after closing the dropdown.

### Implementation Pattern — Tab Wrapping

```ts
// In InlineEntryRow.handleKeyDown
case 'Tab':
    e.preventDefault();
    if (!e.shiftKey) {
        inputRefs.current[(fieldIndex + 1) % schema.fields.length]?.focus();
    } else {
        inputRefs.current[
            (fieldIndex - 1 + schema.fields.length) % schema.fields.length
        ]?.focus();
    }
    break;
```
The `% schema.fields.length` modulo wrapping ensures:
- Tab on index `N-1` (last) → focuses index `0` (first)
- Shift+Tab on index `0` (first) → focuses index `N-1` (last)
- Single-field schema (N=1): Tab stays on index `0` (same field)

### Implementation Pattern — RelationCombobox Tab Passthrough

```tsx
// In RelationCombobox, search input onKeyDown
onKeyDown={(e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        externalKeyDown?.(e as unknown as React.KeyboardEvent<HTMLButtonElement>);
        return;
    }
    handleKeyDown(e);
}}
```

**Why `as unknown as React.KeyboardEvent<HTMLButtonElement>`:** The `externalKeyDown` prop is typed for the trigger `<button>` element (`React.KeyboardEvent<HTMLButtonElement>`), but here it's fired from the search `<input>`. The runtime shape is identical — the handler only reads `e.key` and `e.shiftKey`, both of which are present on the input event. The double cast is intentional and safe.

**`externalKeyDown` flow:** `externalKeyDown` is InlineEntryRow's `handleKeyDown` bound to the relation field's index. When called with a Tab event, it will:
1. Call `e.preventDefault()` (already called — harmless to call twice on the same event)
2. Focus `inputRefs.current[(fieldIndex ± 1) % length]` — the next or previous field in the row

The dropdown closes via `setIsOpen(false)` **before** `externalKeyDown` is called, so by the time the next field is focused, the dropdown is already in the process of being removed from the DOM.

### Testing Pattern

Test files in `tests/` (non-negotiable per `docs/project-context.md`). Use the same mocking boilerplate from `tests/dataLabKeyboardInlineEntry.test.tsx`:

```tsx
vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: vi.fn().mockImplementation(({ count, estimateSize }) => ({
        getVirtualItems: () =>
            Array.from({ length: count }, (_, i) => ({
                index: i,
                key: i,
                start: i * estimateSize(),
                size: estimateSize(),
            })),
        getTotalSize: () => count * estimateSize(),
        measureElement: vi.fn(),
        scrollToIndex: vi.fn(),
    })),
}));
```

Testing Tab → focus transition in jsdom:
```ts
const nameInput = screen.getByPlaceholderText(/enter name/i);
nameInput.focus();
expect(document.activeElement).toBe(nameInput);

fireEvent.keyDown(nameInput, { key: 'Tab', shiftKey: false });
// With our e.preventDefault() + explicit .focus() call, activeElement should change:
expect(document.activeElement).toBe(screen.getByPlaceholderText(/enter amount/i));
```
**Important:** jsdom does NOT simulate `Tab` by changing focus automatically. Our implementation calls `inputRefs.current[next]?.focus()` explicitly inside the `case 'Tab'` handler, so `document.activeElement` WILL update after `fireEvent.keyDown`. This is the correct pattern.

For RelationCombobox Tab (Test 8), use `mockSchemaWithRelation`:
```ts
const mockSchemaWithRelation = {
    _id: 'schema:rel',
    type: 'schema' as const,
    name: 'Rel Ledger',
    fields: [
        { name: 'Name', type: 'text' as const, required: true },
        { name: 'Target', type: 'relation' as const, relationTarget: 'schema:other' },
    ],
    profileId: 'profile-1',
    projectId: 'project-1',
    schema_version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};
```

Override `useLedgerStore` to return this schema:
```ts
(useLedgerStore as any).mockReturnValue({
    schemas: [mockSchemaWithRelation],
    entries: { 'schema:rel': [] },
    allEntries: { 'schema:rel': [] },
    fetchEntries: vi.fn(),
    deleteEntry: vi.fn(),
    createEntry: vi.fn().mockResolvedValue('entry:new'),
    updateEntry: vi.fn(),
});
(useLedgerStore as any).getState.mockReturnValue({
    entries: {},
    fetchEntries: vi.fn(),
});
```

Open the dropdown then test Tab:
```ts
fireEvent.keyDown(window, { key: 'n' }); // open inline row
const comboboxBtn = screen.getByRole('button', { name: /select target/i });
fireEvent.click(comboboxBtn); // open dropdown
const searchInput = screen.getByPlaceholderText('Search entries...');
expect(document.activeElement).toBe(searchInput); // focus is on search input
fireEvent.keyDown(searchInput, { key: 'Tab' });
// Dropdown should close (combobox trigger's aria-expanded becomes false)
expect(comboboxBtn).toHaveAttribute('aria-expanded', 'false');
// Focus should be back on Name field (wrapping: Target is last, Tab wraps to Name)
expect(document.activeElement).toBe(screen.getByPlaceholderText(/enter name/i));
```

### Architecture Guardrails

- **No focus-trap library** (e.g. `focus-trap-react`, `@radix-ui/react-focus-trap`) — custom modulo wrapping in `handleKeyDown` is sufficient and keeps the bundle lean
- **No changes to LedgerTable keyboard handler** — it already skips inputs (`if (e.target instanceof HTMLInputElement ...) return`), so the Tab changes in InlineEntryRow won't conflict
- **No new Zustand store slices** — focus is DOM-managed via `inputRefs`
- **No changes to `Save`/`Cancel` button tabIndex** — they are already not part of the inline row's explicit Tab cycle after this story; they remain `tabIndex=0` for mouse accessibility but are excluded from the keyboard Tab cycle by our intercept
- **No changes to `LedgerView.tsx` or `SchemaBuilder.tsx`** — this is scoped to the inline entry row
- **Modulo wrap is correct for single-field schemas**: `(0 + 1) % 1 === 0` and `(0 - 1 + 1) % 1 === 0` — Tab stays on the same field
- **`e.preventDefault()` before `.focus()` is critical** — prevents the browser from also running its native Tab action concurrently with our explicit focus

### Previous Story Intelligence (3-10)

Story 3-10 added `useDeferredValue` and fuzzy scoring to `RelationCombobox`. The `handleKeyDown` inside `RelationCombobox` was **not** changed in 3-10. The pattern to add Tab handling on the search input is new to this story.

Key test baseline from 3-10: **66 test files, 591 passed, 1 skipped, 0 failed** (7 pre-existing failures in `LoadingSkeleton.test.tsx` are unrelated timeout issues — do not fix). Net new from this story: +1 test file, ≥ 8 test cases, 0 new failures.

From 3-10 dev notes:
- `externalKeyDown` prop on `RelationCombobox` is `(e: React.KeyboardEvent<HTMLButtonElement>) => void | undefined`
- The `!isOpen ? externalKeyDown : undefined` guard on the trigger button is intentional — when open, the trigger has no external handler
- `setHighlightedIndex(-1)` is already called on `onChange` (search term change); also call it on Tab close

### Carry-Forward Items (Deferred from 3-9 and 3-10)

| Item | Priority | Status |
|---|---|---|
| Replace `window.confirm()` in `EntryInspector.tsx` with Zustand confirm-dialog | MEDIUM | Deferred |
| Replace `window.confirm()` in `ProjectDashboard.tsx` with Zustand confirm-dialog | LOW | Deferred |

### Project Structure Notes

- All test files in `/tests` at the project root — **non-negotiable** per `docs/project-context.md`
- New test: `tests/dataLabFocusManagement.test.tsx` — follows `dataLabKeyboardInlineEntry.test.tsx` naming convention
- TypeScript strict mode: `tsconfig.json` has `"strict": true` — all new code must pass
- No barrel exports — import directly from source files

### Files to Touch

| File | Change |
|---|---|
| `src/features/ledger/InlineEntryRow.tsx` | Replace `// Natural tab behavior` no-op with explicit modulo-wrapping Tab/Shift+Tab focus navigation |
| `src/features/ledger/RelationCombobox.tsx` | Intercept `Tab` key on the search `<input>` to close dropdown and forward event to `externalKeyDown` |
| `tests/dataLabFocusManagement.test.tsx` | **Create new** — ≥ 8 test cases covering Tab forward, Tab wrap, Shift+Tab back, Shift+Tab wrap, no Save/Cancel tab, Escape regression, Enter regression, RelationCombobox Tab close |

### Files to NOT Touch

| File | Reason |
|---|---|
| `tests/dataLabKeyboardInlineEntry.test.tsx` | 9 existing tests must pass unchanged |
| `src/features/ledger/LedgerTable.tsx` | Document-level keyboard handler already skips inputs; no changes needed |
| `src/stores/useLedgerStore.ts` | No store changes needed |
| `src/stores/useUIStore.ts` | No new UI state needed |
| `src/components/Inspector/EntryInspector.tsx` | `window.confirm` replacement deferred |
| `src/features/projects/ProjectDashboard.tsx` | `window.confirm` replacement deferred |

### Do-Not-Introduce List

- ❌ No focus-trap library — custom modulo wrapping is sufficient
- ❌ No changes to `tabIndex` attributes on `Save`/`Cancel` buttons
- ❌ No `useEffect` for focus management — synchronous `.focus()` in the keydown handler is correct
- ❌ No changes to the LedgerTable document-level `keydown` handler
- ❌ No new Zustand store state for focus tracking
- ❌ No `setTimeout` delays before `.focus()` — synchronous focus is correct in jsdom and real browsers

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3] — Story 3.11: "Tab, Shift+Tab, Enter, and Escape handlers locking focus entirely within the grid cells."
- [Source: src/features/ledger/InlineEntryRow.tsx#61-81] — `handleKeyDown` with current no-op Tab case
- [Source: src/features/ledger/InlineEntryRow.tsx#24] — `inputRefs` array setup (already exists, correctly typed)
- [Source: src/features/ledger/RelationCombobox.tsx#131-151] — Internal `handleKeyDown` on search input
- [Source: src/features/ledger/RelationCombobox.tsx#159-161] — `onKeyDown={!isOpen ? externalKeyDown : undefined}` on trigger
- [Source: src/features/ledger/RelationCombobox.tsx#175-188] — Search input with current `onKeyDown={handleKeyDown}`
- [Source: tests/dataLabKeyboardInlineEntry.test.tsx] — 9 existing tests (must not regress); mock boilerplate to reuse
- [Source: docs/project-context.md] — Test co-location rule (`/tests`), TypeScript strict, Zustand patterns
- [Source: package.json] — React 19.1.0 (no changes to React version needed)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
