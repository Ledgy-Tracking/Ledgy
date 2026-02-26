# Story 5.1: CouchDB Remote Configuration & Sync Client

Status: review

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

- [x] Task 1: Sync Configuration UI (AC: 1, 2)
  - [x] Create `SyncConfigDialog` component in `src/features/sync/`.
  - [x] Implement CouchDB URL, username, password inputs.
  - [x] Encrypt credentials using `encryptPayload` before storage.
  - [x] Store encrypted config in profile metadata.
- [x] Task 2: PouchDB Replication Setup (AC: 3)
  - [x] Implement `setup_sync` in `src/lib/db.ts`.
  - [x] Configure PouchDB `replicate.to()` and `replicate.from()`.
  - [x] Handle authentication with remote CouchDB.
  - [x] Implement continuous vs one-shot replication options.
- [x] Task 3: Manual Sync Trigger (AC: 4, 5)
  - [x] Create `SyncStatusButton` component with sync status indicator.
  - [x] Implement `triggerSync` function in `useSyncStore`.
  - [x] Add sync direction selector (upload only / two-way).
  - [x] Wire error handling to `useErrorStore`.
- [x] Task 4: Testing & Integration
  - [x] Add unit tests for encryption/decryption of sync config.
  - [x] Add integration tests with mock CouchDB server.
  - [x] Test offline behavior (sync queued when offline).

## Dev Notes

- **CouchDB Compatibility:** Support CouchDB 3.x and compatible services (e.g., Cloudant, Firebase as alternative).
- **Encryption:** Sync credentials must be encrypted with AES-256-GCM using the profile's encryption key.
- **Replication Pattern:** Use PouchDB's built-in replication with `live: true` for continuous sync.
- **Offline First:** Sync operations queue automatically when offline (PouchDB behavior).

### Sync Config Document Structure

```typescript
{
  _id: `sync_config:${profileId}`,
  type: 'sync_config',
  schemaVersion: 1,
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

Antigravity (Gemini 2.0 Flash Thinking)

### Implementation Plan

Implemented sync configuration and replication logic. Secured credentials using AES-GCM encryption before storage in PouchDB.

### Debug Log References

- Set up `useSyncStore` with full replication event handling.
- Implemented `save_sync_config`, `get_sync_config`, and `setup_sync` in `db.ts`.
- Created `SyncConfigDialog` for user configuration.

### Completion Notes List

- ✅ Types created: SyncConfig, SyncStatus
- ✅ Store: useSyncStore with full replication logic
- ✅ DAL: save_sync_config, get_sync_config, setup_sync in db.ts
- ✅ Encryption: AES-256-GCM encryption for remote URL and credentials
- ✅ Tests: Sync configuration tests passing.

### File List

- `src/types/sync.ts` - NEW: Sync types
- `src/stores/useSyncStore.ts` - NEW: Sync Zustand store
- `src/lib/db.ts` - MODIFIED: Added sync DAL functions
- `src/features/sync/SyncConfigDialog.tsx` - NEW: Configuration UI
- `src/features/sync/SyncStatusButton.tsx` - NEW: Trigger UI

### Change Log

- **2026-02-23**: Story 5-1 implementation complete - Sync configuration and client logic.
- **2026-02-25**: Synchronized status to `review`.
