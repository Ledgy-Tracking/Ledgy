# Refactoring Story: Keyboard Interactions & Empty States

Status: ready-for-dev

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

- [ ] Task 1: Ledger Table Deletion Shortcut
  - [ ] Update `LedgerTable.tsx` to handle the `Delete` keydown event on a selected row.
  - [ ] Wire the event to `useLedgerStore.deleteEntry`.
- [ ] Task 2: Global Canvas Shortcuts
  - [ ] Implement a global listener for the `R` key when the Node Canvas is in focus to trigger manual re-evaluation (if applicable, or prepare the stub).
- [ ] Task 3: Interactive Empty States
  - [ ] Enhance `EmptyCanvasGuide.tsx` to include visual, animated drag-and-drop hints as specified in the UX Design document.
