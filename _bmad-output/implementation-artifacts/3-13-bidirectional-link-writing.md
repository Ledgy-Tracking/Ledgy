# Story 3.13: Bidirectional Link Writing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user linking records across ledgers,
I want relation writes to create and maintain reciprocal backlinks automatically,
so that linked context remains consistent, discoverable, and resilient across edits, deletes, and sync.

## Acceptance Criteria

1. **Create path writes backlinks** — When an entry `A` is created with relation field(s) referencing `B` (single or multi relation), the system writes backlink metadata on `B` in the same save flow.

2. **Update path reconciles backlinks** — When relations on `A` are edited, newly-added targets gain backlinks and removed targets lose backlinks, without leaving stale references.

3. **Delete/restore semantics are safe** — Soft-deleting `A` removes/ignores `A` backlinks from target entries; restoring `A` reconstructs backlinks from current relation data.

4. **Schema-aware relation extraction** — Only fields declared as `type: relation` in the source schema are used for backlink sync; non-relation fields are ignored.

5. **No duplicate backlinks** — Repeated saves with unchanged relation values do not append duplicates.

6. **Cross-ledger compatibility** — Backlinks are maintained even when relations point across different ledger schemas (`relationTarget`).

7. **BackLinksPanel compatibility** — Existing `BackLinksPanel` UX remains functional. If indexed backlinks are unavailable/incomplete, current query fallback (`find_entries_with_relation_to`) continues to work.

8. **Ghost-reference safety** — If a target entry is soft-deleted or missing, write flow does not crash; errors are surfaced via existing error-routing patterns.

9. **Performance guardrail** — Relation reconciliation uses batched writes (`bulkPatchDocuments` where applicable) and avoids N² scans of all entries during normal save operations.

10. **TypeScript and tests** — `npx tsc --noEmit` passes with zero new errors; dedicated regression tests verify create/update/delete/restore backlink correctness.

## Tasks / Subtasks

- [x] Task 1 — Introduce backlink metadata contract in data layer
  - [x] 1.1 Add typed backlink metadata shape (entry-level metadata, not schema field data) in `src/types/ledger.ts`
  - [x] 1.2 Ensure contract does not violate PouchDB reserved field rules and existing validation helpers
  - [x] 1.3 Document merge rules for backlink metadata (idempotent set behavior)

- [x] Task 2 — Implement relation extraction + diff helpers
  - [x] 2.1 Add helper to extract normalized relation target IDs from entry data using schema relation fields only
  - [x] 2.2 Add helper to diff previous vs next relation target sets
  - [x] 2.3 Add helper to build deterministic backlink patch payloads (add/remove)

- [x] Task 3 — Wire bidirectional sync into entry write lifecycle
  - [x] 3.1 In `create_entry`, after schema validation and successful write of source entry, apply backlink add patches to targets
  - [x] 3.2 In `update_entry`, load existing entry first, compute relation delta, apply add/remove patches atomically
  - [x] 3.3 In `delete_entry`/`restore_entry`, reconcile backlinks based on effective active state
  - [x] 3.4 Route failures through `useErrorStore.dispatchError` patterns already used in `db.ts`

- [x] Task 4 — Preserve existing backlink UX behavior
  - [x] 4.1 Keep `find_entries_with_relation_to` usable as fallback for current UI behavior
  - [x] 4.2 Ensure `BackLinksPanel` displays consistent counts after create/update/delete/restore flows
  - [x] 4.3 Validate compatibility with ghost-reference rendering in `LedgerTable` / `RelationTagChip`

- [x] Task 5 — Add focused regression test suite
  - [x] 5.1 Create `tests/bidirectionalLinkWriting.test.ts`
  - [x] 5.2 Cover create-time backlink writes (single + multi relation)
  - [x] 5.3 Cover update-time add/remove reconciliation
  - [x] 5.4 Cover soft-delete + restore backlink lifecycle
  - [x] 5.5 Cover idempotency (no duplicate backlinks) and missing-target handling
  - [x] 5.6 Ensure existing tests (`tests/SoftDelete.test.ts`, `tests/BackLinksPanel.test.tsx`) still pass

- [x] Task 6 — Validate and stabilize
  - [x] 6.1 Run `npx vitest run tests/bidirectionalLinkWriting.test.ts tests/SoftDelete.test.ts tests/BackLinksPanel.test.tsx`
  - [x] 6.2 Run `npx tsc --noEmit`
  - [x] 6.3 Update any story notes if implementation reveals hidden edge cases

## Dev Notes

### Story Foundation (Epic/PRD)

- Epic 3 defines Story 3.13 as: **"Bidirectional Link Writing — sync logic ensuring if A links to B, B's document is updated with A's backlink."**
- PRD reinforces bidirectional many-to-many linking (**FR9**) and relational integrity under deletion through soft-delete patterns (**FR10**, Ghost References).

### Developer Context Section

- Current code already supports backlink *discovery* via scan (`find_entries_with_relation_to`) and backlink *display* (`BackLinksPanel`).
- Current gap for this story: no explicit backlink write/reconcile path in `create_entry` / `update_entry`.
- Keep storage/encryption invariants intact:
  - `create_entry` / `update_entry` validate against schema first.
  - Encrypted flows write `data_enc` and keep plaintext `data` empty.
- Reuse existing typed batch infrastructure in `Database.bulkPatchDocuments()` instead of ad-hoc private DB access.

### Technical Requirements

- MUST keep source-of-truth relation values in schema-defined relation fields.
- MUST treat backlink metadata as derived/index data; recomputable if needed.
- MUST be idempotent for repeated saves.
- MUST preserve soft-delete behavior (`isDeleted`, `deletedAt`) and never hard-delete for relational cleanup.
- MUST not swallow errors silently; follow established `dispatchError` + throw behavior in critical paths.

### Architecture Compliance

- Follow data-layer boundaries in `src/lib/db.ts`; avoid pushing persistence orchestration into UI components.
- Maintain strict TypeScript contracts (`src/types/ledger.ts`) and avoid `as any` shortcuts for document writes.
- Keep behavior compatible with ghost-reference handling and migration paths already in `list_entries` / `list_all_entries`.

### Library & Framework Requirements

- Pinned project versions (from `package.json`):
  - `pouchdb` `^9.0.0`
  - `@tanstack/react-virtual` `^3.13.21`
  - `zod` `^4.3.6`
- Latest npm metadata checked:
  - `pouchdb`: `9.0.0` (aligned)
  - `zod`: `4.3.6` (aligned)
  - `@tanstack/react-virtual`: `3.13.22` (project is one patch behind; no forced upgrade in this story)

### File Structure Requirements

- Primary modifications expected:
  - `src/lib/db.ts`
  - `src/types/ledger.ts`
  - `tests/bidirectionalLinkWriting.test.ts`
- Likely touchpoints for compatibility checks (minimal edits preferred):
  - `src/stores/useLedgerStore.ts`
  - `src/features/ledger/BackLinksPanel.tsx`
  - Existing relation/ghost tests under `tests/`

### Testing Requirements

- Add deterministic tests for create/update/delete/restore reconciliation.
- Ensure fallback scan path still returns correct backlinks if indexed metadata absent.
- Include edge cases:
  - self-reference in relation arrays
  - duplicate relation IDs in input payload
  - relation target missing/deleted at write time
  - encrypted vs non-encrypted entry flows (if feasible in unit scope)

### Previous Story Intelligence (3.12)

- Prefer typed DB APIs over private/internal DB access.
- Preserve selection/state integrity and avoid partial-success ambiguity patterns.
- Keep regressions visible with explicit tests before marking done.

### Git Intelligence Summary (recent)

- Recent Story 3.12 work tightened bulk mutation APIs and review hardening.
- This story should follow same pattern: explicit data-layer helpers, revision-safe batch writes, and targeted tests.

### Latest Technical Information

- PouchDB bulk operations require revision-aware writes under the hood; current `bulkPatchDocuments` already encapsulates get+merge+bulkDocs flow.
- Use that helper for backlink patch fan-out to reduce conflict-prone custom loops.

### Project Context Reference

- Core context: `_bmad-output/project-context.md`
- Also review `docs/project-context.md` for broader architectural constraints and test location conventions.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#epic-3-relational-ledger-engine-core-data]
- [Source: _bmad-output/planning-artifacts/prd.md#functional-requirements]
- [Source: _bmad-output/planning-artifacts/prd.md#non-functional-requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- [Source: src/lib/db.ts]
- [Source: src/stores/useLedgerStore.ts]
- [Source: src/features/ledger/BackLinksPanel.tsx]
- [Source: _bmad-output/implementation-artifacts/3-12-data-lab-bulk-selection-edit-states.md]

## Story Completion Status

- Story implemented with bidirectional backlink write/reconcile logic in entry lifecycle paths.
- Story status set to: `done`.
- Completion note: **Backlink metadata is now maintained idempotently on relation targets across create/update/delete/restore, with schema-aware extraction and batched writes.**

## Senior Developer Review (AI)

Outcome: **Approve**

Findings fixed during review:

- Enforced schema-aware backlink fallback scanning so only schema `relation` fields are considered in `find_entries_with_relation_to`.
- Added indexed backlink read path (target `backLinks` metadata) before fallback scan to preserve BackLinksPanel compatibility while reducing unnecessary scans.
- Added rollback protections in `create_entry`, `update_entry`, `delete_entry`, and `restore_entry` so backlink reconciliation failures do not leave inconsistent source-entry state.
- Corrected `BackLinksPanel` schema resolution to use `entry.schemaId` instead of `entry.ledgerId`.
- Added/updated regression coverage for schema-aware fallback behavior and schema ID handling in panel tests.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex (model ID: gpt-5.3-codex)

### Debug Log References

- `git --no-pager log -n 5 --pretty=format:"%h %s"`
- `rg` searches across planning artifacts and source files
- npm registry metadata checks for `pouchdb`, `@tanstack/react-virtual`, `zod`

### Completion Notes List

- [x] Story foundation analyzed (epics + PRD)
- [x] Architecture and code touchpoints mapped
- [x] Previous story intelligence incorporated
- [x] Latest package version intelligence incorporated
- [x] Story scaffolded with implementation-ready tasks and guardrails
- [x] Added backlink metadata contract (`BackLinkMetadata`) to entry type and updated relation validation to support single/multi values
- [x] Implemented schema-aware relation extraction/diff and deterministic backlink merge helpers in `src/lib/db.ts`
- [x] Wired backlink reconciliation into `create_entry`, `update_entry`, `delete_entry`, and `restore_entry` with warning/error routing via `useErrorStore`
- [x] Added regression suite `tests/bidirectionalLinkWriting.test.ts` for create/update/delete/restore/idempotency/missing-target and fallback query compatibility
- [x] Validation run: targeted story tests passed; `npx tsc --noEmit` passed; `npm run build` passed
- [x] Full `npm run test` run showed pre-existing unrelated failures in long-running suite (e.g., `src/lib/crypto.test.ts`, `tests/dataLabHeaderSorting.test.tsx`, `tests/dataLabBulkSelection.test.tsx`, `tests/SchemaBuilder.test.tsx`)
- [x] Review fixes applied: schema-aware fallback filtering, indexed backlink read path, write-path rollback guards, BackLinksPanel schema lookup fix
- [x] Re-validation run after review fixes: `npx vitest run tests/bidirectionalLinkWriting.test.ts tests/SoftDelete.test.ts tests/BackLinksPanel.test.tsx` passed; `npx tsc --noEmit` passed

### Change Log

- 2026-03-14: Implemented bidirectional backlink writing with deterministic reconciliation and added focused regression coverage for Story 3.13.
- 2026-03-14: Senior Developer Review (AI) fixes applied and validated; story moved to done.

### File List

- `src/types/ledger.ts` (modified)
- `src/lib/validation.ts` (modified)
- `src/lib/db.ts` (modified)
- `src/stores/useLedgerStore.ts` (modified)
- `src/features/ledger/BackLinksPanel.tsx` (modified)
- `tests/bidirectionalLinkWriting.test.ts` (added)
- `tests/BackLinksPanel.test.tsx` (modified)
- `_bmad-output/implementation-artifacts/3-13-bidirectional-link-writing.md` (updated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated to `done`)


