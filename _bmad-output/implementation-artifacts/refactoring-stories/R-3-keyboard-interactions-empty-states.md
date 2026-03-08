# Refactoring Story: Keyboard Interactions & Empty States

Status: done

## Story

As a power user,
I need the application to fully support the keyboard-first interaction model and provide guided empty states,
So that I can operate at the "speed of thought" and new users understand how to begin without reading documentation.

## Acceptance Criteria

1. **Keyboard-First Deletion:** Pressing the `Delete` (or `Backspace`) key while a row is selected in the `LedgerTable` triggers the soft-delete flow for that entry (with appropriate confirmation or undo if required by UX specs).
2. **Global Shortcuts:** The application respects `R` to run/evaluate the node canvas, and reserves `cmd+Shift+A` for the upcoming AI Capture plugin.
3. **Interactive Node Canvas Empty State:** The empty state for the Node Editor (Node Forge) must be an *interactive* tutorial overlay (e.g., a "first-node drag guide"), not just static text.
4. **No Regressions:** All existing automated tests continue to pass after these interaction updates.

## Tasks / Subtasks

- [x] Task 1: Ledger Table Deletion Shortcut
  - [x] Update `LedgerTable.tsx` to handle the `Delete` keydown event on a selected row.
  - [x] Wire the event to `useLedgerStore.deleteEntry`.
- [x] Task 2: Global Canvas Shortcuts
  - [x] Implement a global listener for the `R` key when the Node Canvas is in focus to trigger manual re-evaluation (if applicable, or prepare the stub).
- [x] Task 3: Interactive Empty States
  - [x] Enhance `EmptyCanvasGuide.tsx` to include visual, animated drag-and-drop hints as specified in the UX Design document.

## Dev Agent Record

### Agent Model Used
Antigravity (Gemini 2.0 Flash Thinking)

### Completion Notes List
- ✅ Implemented `Delete` and `Backspace` hotkeys in `LedgerTable.tsx` for quick entry deletion
- ✅ Implemented `R` hotkey in `NodeCanvas.tsx` for manual evaluation stub
- ✅ Refactored `EmptyCanvasGuide.tsx` to be interactive with an "Add Ledger Node" button and pulse animations
- ✅ Updated `EmptyCanvasGuide.test.tsx` and `NodeCanvas.test.tsx` to reflect new interactive state

### File List
- `src/features/ledger/LedgerTable.tsx` - MODIFIED
- `src/features/nodeEditor/NodeCanvas.tsx` - MODIFIED
- `src/features/nodeEditor/EmptyCanvasGuide.tsx` - MODIFIED
- `tests/EmptyCanvasGuide.test.tsx` - MODIFIED
- `tests/NodeCanvas.test.tsx` - MODIFIED

### Change Log
- **2026-02-25**: Story R-3 implementation complete - Keyboard shortcuts and interactive empty states added. 147 tests passing.
