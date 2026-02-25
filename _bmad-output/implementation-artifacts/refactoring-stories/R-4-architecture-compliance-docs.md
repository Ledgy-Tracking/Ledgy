# Refactoring Story: Architecture Documentation Compliance

Status: ready-for-dev

## Story

As a core maintainer,
I need the historical implementation artifacts (Stories) to strictly conform to the project architecture,
So that future AI agents do not adopt anti-patterns (such as invalid PouchDB field names).

## Acceptance Criteria

1. **Purge `_type` Fields:** All instances of `_type` in the Markdown documentation and codebase are removed and replaced with the correct `type` key per the architecture envelope requirements.
2. **Standardize `schemaVersion`:** All references to `schema_version` in markdown docs align with the `camelCase` requirement (`schemaVersion`) to prevent confusion.
3. **Ghost Reference Integrity:** `isDeleted` and `deletedAt` are verified on the `delete_project`, `delete_profile`, and `delete_schema` functions, not just `delete_entry`.

## Tasks / Subtasks

- [ ] Task 1: Markdown Scrubbing
  - [ ] Search and replace `_type` with `type` in all `.md` files within `_bmad-output/implementation-artifacts/`.
  - [ ] Search and replace `schema_version` with `schemaVersion` in all `.md` files.
- [ ] Task 2: Codebase Compliance Check
  - [ ] Review `src/lib/db.ts` to ensure `type` and `schemaVersion` are the exact keys used in `createDocument` and all update functions.
  - [ ] Ensure `delete_profile` hard-deletes, while `delete_schema` and `delete_project` soft-delete utilizing `isDeleted` and `deletedAt`.
