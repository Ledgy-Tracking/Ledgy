# Story 2.7: Template Engine (JSON Export)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Ledgy user who has built a profile with custom schemas**,
I want **to export my profile's schema metadata as a portable `.ledgy.json` file**,
so that **I can share my structure with others, back it up, or bootstrap a new profile from my existing schema layout without taking any of my personal entry data with it.**

## Acceptance Criteria

1. When the user clicks the Export button in the Dashboard toolbar (visible only when at least one ledger/schema exists), the system serializes all active schemas (non-deleted) and the optional node graph canvas into a `TemplateExport` JSON structure and triggers a file save.
2. In the **Tauri desktop environment**, a native OS Save dialog opens pre-populated with the filename `{profile-name}-{YYYY-MM-DD}.ledgy.json`; the file is written to the user-chosen path using the Tauri FS API.
3. In the **browser environment**, the JSON is downloaded automatically via a programmatic `<a>` link click with the same filename convention.
4. The exported JSON **MUST NOT contain any ledger entries** — only schema metadata (names, field definitions, field types) and the node graph layout.
5. After a successful export, the user receives a **success notification** via the global `useNotificationStore.addNotification()` with type `'success'`.
6. If the export fails (e.g., Tauri FS write error), the error is dispatched to `useErrorStore.dispatchError()` — no local `useState` error handling.
7. If the user **cancels** the Tauri Save dialog (returns `null` path), the export silently aborts with no error shown.
8. The `useTemplateStore` exposes a `reset()` action that sets the store back to its initial state — enabling the memory-sweep pattern established in Story 2.6.
9. **CRITICAL**: Developer MUST use the existing `main` git branch for this epic.

## Tasks / Subtasks

- [x] Task 1: Add success notification to `useTemplateStore.exportTemplate()` (AC: #5)
  - [x] 1.1: Import `useNotificationStore` in `src/stores/useTemplateStore.ts`.
  - [x] 1.2: After a successful save (both Tauri and browser paths), call `useNotificationStore.getState().addNotification('Template exported successfully', 'success')`.
- [x] Task 2: Add `reset()` action to `useTemplateStore` (AC: #8)
  - [x] 2.1: Define `initialState` constant (`{ isExporting: false, isImporting: false, error: null }`) above the `create()` call.
  - [x] 2.2: Add `reset: () => set(initialState)` to the store, matching the pattern from `useLedgerStore`, `useNodeStore`, etc.
- [x] Task 3: Write `useTemplateStore` unit tests (AC: #1–#7)
  - [x] 3.1: Create `src/stores/useTemplateStore.test.ts`.
  - [x] 3.2: Test success path (browser): mock `isTauri → false`, mock `downloadTemplateBrowser`, assert `isExporting` goes `false → true → false` and `addNotification` is called with `'success'`.
  - [x] 3.3: Test success path (Tauri): mock `isTauri → true`, mock `saveTemplateTauri` returning a path, assert notification fired.
  - [x] 3.4: Test Tauri cancel path: mock `saveTemplateTauri` returning `null`, assert no notification and no error, `isExporting` resets to `false`.
  - [x] 3.5: Test error path: mock `export_template` to throw, assert `useErrorStore.dispatchError` called and `isExporting` resets to `false`.
  - [x] 3.6: Test `reset()` action: set `isExporting: true` manually, call `reset()`, assert store returns to `initialState`.
- [x] Task 4: Verify `ExportTemplateButton` is correctly integrated (AC: #1)
  - [x] 4.1: Confirm `src/features/templates/ExportTemplateButton.tsx` renders with `disabled` state while exporting and passes `aria-label="Export template"`.
  - [x] 4.2: Confirm `Dashboard.tsx` conditionally renders `<ExportTemplateButton />` only when `hasLedgers === true` (already wired — verify only).
- [x] Task 5: Register `useTemplateStore` in the memory-sweep (AC: #8, Story 2.6 continuity)
  - [x] 5.1: Check `src/stores/memorySweeps.test.ts` and `memorySweeps.test.tsx` — if a global sweep registry exists, add `useTemplateStore.getState().reset()` to it. If not, document the omission in Dev Notes.

## Dev Notes

### Critical: What Is Already Implemented

> **DO NOT re-implement the core export pipeline.** It exists and has tests. Your job is to **complete the integration layer** (notification, reset action, store tests).

The following are **already implemented and tested** in `src/lib/templateExport.ts`:
- `export_template(db, includeNodeGraph, profileName)` — queries `list_schemas()` + `load_canvas()`, assembles `TemplateExport`
- `generateTemplateFilename(profileName)` — returns `{safe-name}-{YYYY-MM-DD}.ledgy.json`
- `downloadTemplateBrowser(template, filename)` — creates `<a>` element and triggers download
- `saveTemplateTauri(template, filename)` — uses Tauri dialog + FS APIs via `Function()` constructor (intentional — avoids Vite static analysis)
- `isTauri()` — checks `'__TAURI__' in window`

The following are **already implemented** in `src/stores/useTemplateStore.ts`:
- `exportTemplate(includeNodeGraph?)` — full flow with `isExporting` flag, error dispatch
- `importTemplate()` — stub (Task for Story 2-8)

The following UI is **already wired**:
- `src/features/templates/ExportTemplateButton.tsx` — renders Export button, calls `exportTemplate(true)`
- `src/features/dashboard/Dashboard.tsx` — conditionally renders `<ExportTemplateButton />` when `hasLedgers`

### What Is Missing (Your Work)

1. **Success notification** — `exportTemplate` currently dispatches errors via `useErrorStore` but **never calls `useNotificationStore.addNotification()`** on success. This is the primary gap.
2. **`reset()` action** — `useTemplateStore` lacks it, unlike `useLedgerStore`, `useNodeStore`, `useDashboardStore`, `useSyncStore` (which all gained `reset()` in Story 2.6).
3. **Store-level unit tests** — `src/stores/useTemplateStore.test.ts` does not exist.

### Architecture Compliance

- **File locations**: `src/stores/useTemplateStore.ts`, `src/lib/templateExport.ts`, `src/features/templates/ExportTemplateButton.tsx` — all already correct per architecture FR16 mapping.
- **Naming**: `useTemplateStore` (Zustand), `export_template` (utility function snake_case), `ExportTemplateButton` (PascalCase component).
- **Error handling pattern**: Errors → `useErrorStore.getState().dispatchError(msg)` — **never** local `useState`.
- **Loading state**: `isExporting` lives in the Zustand store — **never** local component state.
- **Tauri invoke pattern**: NOT used here. The Tauri FS/dialog calls are direct API calls (the Universal Web API layer note in architecture permits direct Tauri API calls for OS integrations like file save dialogs).
- **Branch**: Use `main` branch (confirmed active for Epic 2, per Story 2.6 AC#6).

### Store Modification Pattern (from Story 2.6)

```typescript
// Pattern established across all stores — apply to useTemplateStore
const initialState = {
  isExporting: false,
  isImporting: false,
  error: null,
};

export const useTemplateStore = create<TemplateState>((set) => ({
  ...initialState,
  // ... actions
  reset: () => set(initialState),
}));
```

### Notification Pattern

```typescript
// After successful export (both Tauri and browser paths):
import { useNotificationStore } from './useNotificationStore';

// Inside exportTemplate, after the save succeeds:
useNotificationStore.getState().addNotification('Template exported successfully', 'success');
set({ isExporting: false });
```

### `TemplateExport` JSON Shape (for reference)

```typescript
// From src/types/templates.ts
interface TemplateExport {
  exportVersion: '1.0';
  exportedAt: string;      // ISO 8601
  profileName: string;
  schemas: LedgerSchema[]; // schema metadata only — NO entries
  nodeGraph?: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    viewport: Viewport;
  };
}
```

### Test File Structure

```typescript
// src/stores/useTemplateStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTemplateStore } from './useTemplateStore';

vi.mock('../lib/templateExport', () => ({
  export_template: vi.fn(),
  generateTemplateFilename: vi.fn().mockReturnValue('test-2026-03-07.ledgy.json'),
  downloadTemplateBrowser: vi.fn(),
  saveTemplateTauri: vi.fn(),
  isTauri: vi.fn(),
}));

vi.mock('./useProfileStore', () => ({
  useProfileStore: {
    getState: () => ({
      activeProfileId: 'profile-1',
      profiles: [{ id: 'profile-1', name: 'Test Profile' }],
    }),
  },
}));
// ... etc
```

### Key Dependency: `getProfileDb`

`exportTemplate` calls `getProfileDb(state.activeProfileId)` from `src/lib/db.ts`. In tests, mock this:
```typescript
vi.mock('../lib/db', async () => ({
  ...(await vi.importActual('../lib/db') as any),
  getProfileDb: vi.fn().mockReturnValue({}),
}));
```

### Memory Sweep Verification

Checked `src/stores/memorySweeps.test.ts` and `memorySweeps.test.tsx`. The existing sweep orchestration calls `clearProfileData()` on stores that hold profile-specific data (schemas, nodes, widgets, syncConfig). `useTemplateStore` only holds transient in-flight state (`isExporting`, `isImporting`, `error`) — no profile data. Adding it to the App.tsx sweep effect is not warranted since there is no profile-scoped data to clear, and the pattern requires `clearProfileData()` not `reset()`. The `reset()` action is available for any future consumer that needs it (e.g., full vault lock flows).

### Project Structure Notes

- All files already in correct locations per architecture spec.
- `src/features/templates/` is the designated FR16 directory.
- No new directories needed.
- `useTemplateStore.test.ts` is the only **new file** to create.

### References

- [Source: architecture.md#FR to Directory Mapping] `src/features/templates/` for FR16 (Templates)
- [Source: architecture.md#Implementation Patterns] Error → `useErrorStore`, Loading → Zustand store
- [Source: architecture.md#Universal Web API Layer] Tauri APIs for OS file save — direct calls permitted
- [Source: src/lib/templateExport.ts] Core export implementation (complete)
- [Source: src/stores/useTemplateStore.ts] Store (needs reset + notification)
- [Source: src/stores/useNotificationStore.ts] `addNotification(message, type)` → auto-removes after 5s
- [Source: src/stores/useErrorStore.ts] `dispatchError(message)` for errors
- [Source: _bmad-output/implementation-artifacts/2-6-cross-profile-storage-memory-sweeps.md] `reset()` pattern
- [Source: src/features/templates/ExportTemplateButton.tsx] Existing UI component (complete)
- [Source: src/features/dashboard/Dashboard.tsx:78] Integration point

## Dev Agent Record

### Agent Model Used

claude-sonnet-4.6 — 2026-03-08

### Debug Log References

### Completion Notes List

- Comprehensive context engine analysis completed
- Core export pipeline confirmed fully implemented in `src/lib/templateExport.ts`
- Three targeted gaps identified: success notification, `reset()` action, store-level tests
- Architecture compliance verified: correct file locations, naming conventions, error patterns
- Memory sweep integration cross-referenced with Story 2.6 — `useTemplateStore` holds only transient in-flight state; not added to App.tsx sweep (no profile data to clear)
- Task 1 complete: Added `useNotificationStore` import and `addNotification('Template exported successfully', 'success')` call after both Tauri and browser save paths
- Task 2 complete: Added `initialState` constant and `reset: () => set(initialState)` following Story 2.6 pattern
- Task 3 complete: Created `src/stores/useTemplateStore.test.ts` with 5 tests covering browser success, Tauri success, Tauri cancel, error path, and reset() — all pass
- Task 4 complete: Verified `ExportTemplateButton` has `disabled={isExporting}` and `aria-label="Export template"`; Dashboard renders it conditionally at line 78
- Task 5 complete: Memory sweep assessed — omission documented in Dev Notes (transient state only, no profile data)
- Full regression suite run: all pre-existing failures confirmed pre-existing (useSyncStore, auth guards, inactivity timer); no new regressions introduced

### File List

- `_bmad-output/implementation-artifacts/2-7-template-engine-json-export.md` (CREATED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED — status: review)
- `src/stores/useTemplateStore.ts` (MODIFIED — added `useNotificationStore` import, `initialState`, `reset()` action, success notification)
- `src/stores/useTemplateStore.test.ts` (CREATED — 5 unit tests)
