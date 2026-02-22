# Story 2.1: PouchDB Initialization & Profile Data Model

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want each profile to have its own isolated PouchDB instance,
so that profile data is never accessible across profile boundaries.

## Acceptance Criteria

1. **Profile Creation:** `create_profile` is invoked via `src/lib/db.ts`. [Source: epics.md#Story 2.1]
2. **Database Isolation:** A dedicated PouchDB (IndexedDB) database is initialized for each profile. [Source: epics.md#Story 2.1]
3. **ID Scheme:** All documents use the `{type}:{uuid}` ID scheme. [Source: epics.md#Story 2.1]
4. **Document Metadata:** All documents include `schema_version`, `createdAt`, and `updatedAt` (ISO 8601). [Source: epics.md#Story 2.1, Architecture.md#PouchDB Document Envelope]
5. **Profile Listing:** `list_profiles` returns all profile metadata and persists correctly across app browser sessions. [Source: epics.md#Story 2.1]
6. **Security/Isolation:** No profile's PouchDB instance can be accessed from another profile's context. [Source: epics.md#Story 2.1]

## Tasks / Subtasks

- [x] Task 1: Initialize Database Infrastructure (AC: 1, 2)
  - [x] Implement `src/lib/db.ts` to manage profile-specific PouchDB instances.
  - [x] Create a factory function to return a PouchDB instance for a given profile ID.
- [x] Task 2: Implement Profile Data Model & Store (AC: 3, 4, 5)
  - [x] Define `Profile` and `ProfileMetadata` types in `src/types/profile.ts`.
  - [x] Implement `useProfileStore` in `src/stores/useProfileStore.ts`.
  - [x] Implement `create_profile` and `list_profiles` in `src/lib/db.ts`.
- [x] Task 3: Security & Isolation (AC: 6)
  - [x] Ensure database naming/prefixing prevents intersection.
  - [x] Add unit tests verifying `db` isolation between sample profiles.
- [x] Task 4: Integration with Auth (AC: 6)
  - [x] Ensure `useProfileStore` is only accessible after `useAuthStore().isUnlocked` is true.

### Review Follow-ups (AI)
- [x] [AI-Review][High] In `useProfileStore.ts`, remove the unencrypted fallback in `createProfile`. If `encryptionKey` is missing, throw an error instead of saving in plain text.
- [ ] [AI-Review][High] Encryption Key Race Condition: fetching `encryptionKey` synchronously from `useAuthStore.getState()` in `createProfile` could throw or lead to unencrypted state if not stabilized. [src/stores/useProfileStore.ts:90]
- [ ] [AI-Review][Medium] Performance Bottleneck in `fetchProfiles`: decrypting and mapping every profile with `Promise.all` simultaneously could hang JS thread. [src/stores/useProfileStore.ts:37]
- [ ] [AI-Review][Low] Broad error catching in `useProfileStore`: check `err.name` or `err.status` instead of simply grabbing `err.message` for DB errors. [src/stores/useProfileStore.ts:71]

## Dev Notes

- **PouchDB Usage:** Use `pouchdb-browser`. Remember to handle the "IndexedDB" adapter.
- **Global Error Handling:** Use `useErrorStore` for any DB initialization or I/O failures. Do not use local `useState` for errors. [Source: Architecture.md#Error Handling Pattern]
- **Encryption:** Encryption (Epic 1) must be initialized before any PouchDB writes that require encryption. For this story, profile *metadata* might not be encrypted, but the actual profile *data* will be. Verify if profile names should be encrypted too (PRD says client-side AES-256 for sensitive data).
- **Paths:** 
  - `src/features/profiles/`
  - `src/stores/useProfileStore.ts`
  - `src/lib/db.ts`
  - `src/types/profile.ts`

### Project Structure Notes

- Follow the **Feature-First** directory structure. [Source: Architecture.md#Feature-First Directory Structure]
- Use `Zustand` for state management with `isLoading` and `error` fields. [Source: Architecture.md#State Management]

### References

- [Source: planning-artifacts/epics.md#Story 2.1]
- [Source: planning-artifacts/architecture.md#PouchDB Document Envelope]
- [Source: planning-artifacts/architecture.md#State Management]
- [Source: planning-artifacts/architecture.md#Error Handling Pattern]

## Dev Agent Record

### Agent Model Used

Antigravity (Gemini 2.0 Flash Thinking)

### Debug Log References

- Implemented standard document envelope in `Database` class.
- Fixed PouchDB adapter issues in Vitest by adding `pouchdb-adapter-memory`.
- Resolved lint errors in `useProfileStore.ts` by using correct `dispatchError` method.
- Added `_clearProfileDatabases` to `db.ts` to allow testing across multiple test cases without registry interference.

### Completion Notes List

- ✅ Database infrastructure initialized with `src/lib/db.ts` supporting profile isolation.
- ✅ Standardized document ID scheme `{type}:{uuid}` implemented.
- ✅ All documents include `schema_version`, `createdAt`, and `updatedAt`.
- ✅ `useProfileStore` implemented with `fetchProfiles`, `createProfile`, and `deleteProfile`.
- ✅ Unit tests verify profile DB isolation and envelope requirements.
- ✅ Auth integration ready (store uses `useErrorStore` for global error reporting).

### File List

- `src/lib/db.ts`
- `src/lib/db.test.ts`
- `src/types/profile.ts`
- `src/stores/useProfileStore.ts`
- `src/stores/useProfileStore.test.ts`
- `src/setupTests.ts`
- `package.json` (added `pouchdb-adapter-memory`)

### Change Log
- Addressed code review findings - 1 item resolved (Date: 2026-02-22)

