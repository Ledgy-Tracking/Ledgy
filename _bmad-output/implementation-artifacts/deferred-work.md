# Deferred Work

## Deferred from: code review of 3-15-local-undo-redo-stack (2026-04-04)

- **[D1][High] Backlink reconciliation bypassed during undo/redo of `update`** — `applyMutationsForward/Reverse` call `db.updateDocument` directly, bypassing `reconcileBackLinksForSource`. Relation target documents keep stale backlinks after undo/redo of an update that modified relation fields. Requires bundling backlink doc snapshots into the action record or invoking reconcile from the undo/redo path.

- **[D2][High] Undo of `create` doesn't strip outgoing backlinks from relation targets** — `applyMutationsReverse` for `create` only sets `isDeleted: true` on the source entry. Backlink records on relation target documents are not removed. Mirrors what `delete_entry` does via `reconcileBackLinksForSource(nextTargets = new Map())`.

- **[D3][High] Redo of `delete` doesn't run backlink reconciliation** — `applyMutationsForward` writes the snapshot `newState` (with `isDeleted: true`) without stripping outgoing backlinks from target documents.

- **[D4][High] Bundled mutations not truly atomic** — `applyMutationsForward/Reverse` loop over mutations with sequential `await db.updateDocument()` calls and no per-mutation rollback. A mid-loop failure partially writes to the DB while the action is not removed from the undo/redo stack; subsequent retry re-applies the already-written mutations.

- **[D5][Med] Race condition: concurrent async undo keypresses can double-apply the same action** — the `handle` function in `useUndoRedoShortcuts` is async and not debounced/guarded. Two rapid Ctrl+Z presses can both snapshot the same top-of-stack action before either removes it.

- **[D6][Med] `fetchEntries` unconditionally called after conflict** — on a PouchDB 409 conflict, `undoAction` dispatches an error toast and returns. The shortcut hook then calls `fetchEntries` regardless, which can dispatch its own error and overwrite the conflict toast.

- **[D7][Med] `activeSchemaId` stale after async undo during ledger switch** — `activeSchemaId` is read after `await undoRedo.undoAction(...)` resolves in the hook. If the user switched ledgers during the await, `fetchEntries` is called for the new (wrong) ledger; the undo result is invisible until the user manually switches back.

- **[D8][Med] Integration test async-leak hazard** — `afterEach` calls `db.destroy()` which removes the profile from the `profileDatabases` cache. If any async operation from the prior test resolves after `afterEach` (e.g. JIT migration write-back), it calls `getProfileDb` on a destroyed profile and creates a fresh empty DB. Low practical risk given unique profileIds per test.

- **[D9][Low] `applyMutationsReverse` for `delete` bypasses schema validation** — restoring an old snapshot via `db.updateDocument` skips `validateEntryAgainstSchema`. If the schema added required fields after the entry was deleted, the restored document may not satisfy the current schema.

- **[D10][Low] Unhandled non-conflict error in `useUndoRedoShortcuts`** — if `undoAction/redoAction` re-throws a non-409 error, `fetchEntries` is skipped and the rejection propagates to the window event handler, silently swallowed by the browser with no user feedback.
