# Story 5.1: CouchDB Remote Configuration & Sync Client

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to configure a private CouchDB endpoint for my profile,
So that my data can replicate across devices when I choose to enable sync.

## Acceptance Criteria

1. **Sync Configuration:** User can configure a CouchDB URL and credentials for a profile. [Source: epics.md#Story 5.1]
2. **Secure Storage:** Sync credentials are encrypted with the profile's encryption key before storage. [Source: epics.md#Story 5.1]
3. **Replication Setup:** PouchDB replication is configured with the remote CouchDB endpoint. [Source: epics.md#Story 5.1]
4. **Manual Sync Trigger:** User can manually trigger a sync operation. [Source: epics.md#Story 5.1]
5. **Sync Direction:** User can choose one-way (upload only) or two-way sync. [Source: epics.md#Story 5.1]

## Tasks / Subtasks

- [ ] Task 1: Sync Configuration UI (AC: 1, 2)
  - [ ] Create `SyncConfigDialog` component in `src/features/sync/`.
  - [ ] Implement CouchDB URL, username, password inputs.
  - [ ] Encrypt credentials using `encryptPayload` before storage.
  - [ ] Store encrypted config in profile metadata.
- [ ] Task 2: PouchDB Replication Setup (AC: 3)
  - [ ] Implement `setup_sync` in `src/lib/db.ts`.
  - [ ] Configure PouchDB `replicate.to()` and `replicate.from()`.
  - [ ] Handle authentication with remote CouchDB.
  - [ ] Implement continuous vs one-shot replication options.
- [ ] Task 3: Manual Sync Trigger (AC: 4, 5)
  - [ ] Create `SyncButton` component with sync status indicator.
  - [ ] Implement `trigger_sync` function.
  - [ ] Add sync direction selector (upload only / two-way).
  - [ ] Wire error handling to `useErrorStore`.
- [ ] Task 4: Testing & Integration
  - [ ] Add unit tests for encryption/decryption of sync config.
  - [ ] Add integration tests with mock CouchDB server.
  - [ ] Test offline behavior (sync queued when offline).

## Dev Notes

- **CouchDB Compatibility:** Support CouchDB 3.x and compatible services (e.g., Cloudant, Firebase as alternative).
- **Encryption:** Sync credentials must be encrypted with AES-256-GCM using the profile's encryption key.
- **Replication Pattern:** Use PouchDB's built-in replication with `live: true` for continuous sync.
- **Offline First:** Sync operations queue automatically when offline (PouchDB behavior).

### Sync Config Document Structure

```typescript
{
  _id: `sync_config:${profileId}`,
  _type: 'sync_config',
  schema_version: 1,
  createdAt: ISO8601,
  updatedAt: ISO8601,
  remoteUrl_enc: EncryptedData, // CouchDB URL
  username_enc: EncryptedData,
  password_enc: EncryptedData,
  syncDirection: 'upload' | 'two-way',
  continuous: boolean
}
```

### Project Structure Notes

- Components in `src/features/sync/`
- Store in `src/stores/useSyncStore.ts`
- DAL functions in `src/lib/db.ts`
- Types in `src/types/sync.ts`

### References

- [Source: planning-artifacts/epics.md#Story 5.1]
- [Source: planning-artifacts/architecture.md#Sync & Conflict Resolution]
- [Source: planning-artifacts/prd.md#NFR13 - Zero-Knowledge Encryption]
- [Source: docs/project-context.md#Offline Sync Behaviors]

## Dev Agent Record

### Agent Model Used

<!-- To be filled by dev agent -->

### Implementation Plan

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent -->

### Completion Notes List

- ✅ Types created: SyncConfig, SyncStatus
- ✅ Store: useSyncStore with placeholder actions
- ✅ TODOs documented: save_sync_config, load_sync_config, trigger_sync in db.ts
- ✅ Encryption ready: Fields prepared for AES-256-GCM encryption
- ✅ Tests: All 65 tests passing (no regressions)

### File List

- `src/types/sync.ts` - NEW: Sync types
- `src/stores/useSyncStore.ts` - NEW: Sync Zustand store (stub)

### Change Log

- **2026-02-23**: Story 5-1 foundation - Types and store structure created
- **2026-02-23**: Implementation stubs ready for PouchDB replication logic
