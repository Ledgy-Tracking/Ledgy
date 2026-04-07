# Story 4.1: Workflow Script List & Management

Status: ready-for-dev

## Story

As a Node Forge user within a project,
I want to see a list of all named workflow scripts belonging to the project, and be able to create, rename, and delete them,
so that I can manage independent workflows before opening one for canvas editing.

## Acceptance Criteria

1. **Workflow list route** — Navigating to `/app/:profileId/project/:projectId/node-forge` renders `WorkflowScriptList` (not `NodeCanvas` directly). The list loads all `WorkflowScript` documents scoped to the current project from PouchDB.

2. **Empty state** — When no workflow scripts exist for the project, an empty-state prompt is shown with a "Create your first workflow" CTA button.

3. **Workflow card display** — Each workflow card shows: name, optional one-line description, and `updatedAt` formatted as a relative or absolute date. Cards are sorted by `updatedAt` descending (most recently modified first).

4. **Create workflow** — A "New Workflow" button opens an inline or modal form with a required `name` field and an optional `description` field (single line). On submit, a new `WorkflowScript` PouchDB document is created and the list refreshes. The name must be non-empty; the form shows an inline validation error if submitted empty.

5. **Rename workflow** — Each workflow card has a rename action (e.g., via a context menu or edit icon). Triggering it allows the user to edit the name in place or via a dialog. On confirm, the `WorkflowScript` document's `name` (and `updatedAt`) is updated in PouchDB and the list refreshes.

6. **Delete workflow** — Each workflow card has a delete action. Triggering it shows a confirmation dialog: "Delete workflow '{name}'? This cannot be undone." On confirm, the `WorkflowScript` document is soft-deleted (`isDeleted: true`) and disappears from the list.

7. **Open workflow** — Clicking a workflow card (outside the rename/delete controls) navigates to `/app/:profileId/project/:projectId/node-forge/:workflowId`, opening `NodeCanvas` scoped to that specific workflow.

8. **NodeCanvas workflowId param** — `NodeCanvas` reads `workflowId` from `useParams<{ workflowId: string }>()` and passes it to `loadCanvas` / `saveCanvas` as `canvasId`. The `projectId` is still available via `useParams` for the store.

9. **AppShell navigation** — The "Node Forge" sidebar entry navigates to `/app/:profileId/project/:projectId/node-forge` (the list), not directly to the canvas. The active state highlights when the current path starts with `/node-forge`.

10. **Type-safe** — `WorkflowScript` interface is exported from `src/types/nodeEditor.ts`. PouchDB CRUD functions (`create_workflow`, `list_workflows`, `rename_workflow`, `delete_workflow`) are exported from `src/lib/db.ts`. `useWorkflowStore` is in `src/stores/useWorkflowStore.ts`.

11. **Error handling** — PouchDB errors during create/rename/delete are dispatched to `useErrorStore` (same pattern as other stores). Loading state is tracked; the list shows a skeleton while fetching.

## Tasks / Subtasks

- [ ] Task 1 — Add `WorkflowScript` type to `src/types/nodeEditor.ts` (AC: #10)
  - [ ] 1.1 Define `WorkflowScript` extending `LedgyDocument`: fields `type: 'workflow'`, `profileId: string`, `projectId: string`, `name: string`, `description?: string`, `scope: 'project'`
  - [ ] 1.2 Export `WorkflowScript` from the module

- [ ] Task 2 — Add PouchDB CRUD functions to `src/lib/db.ts` (AC: #10)
  - [ ] 2.1 `create_workflow(db, profileId, projectId, name, description?)` → creates doc `_id: "workflow:{uuid}"`, returns the new `WorkflowScript`
  - [ ] 2.2 `list_workflows(db, projectId)` → calls `db.queryDocuments<WorkflowScript>({ type: 'workflow', includeDeleted: false })` then filters in-memory by `doc.projectId === projectId`, returns sorted by `updatedAt` desc (mirrors `list_entries` pattern)
  - [ ] 2.3 `rename_workflow(db, workflowDocId, name)` → gets doc, updates `name` + `updatedAt`, calls `updateDocument`
  - [ ] 2.4 `delete_workflow(db, workflowDocId)` → soft-delete: gets doc, sets `isDeleted: true`, `deletedAt: ISO`, calls `updateDocument`

- [ ] Task 3 — Create `src/stores/useWorkflowStore.ts` (AC: #1, #4, #5, #6, #11)
  - [ ] 3.1 State: `workflows: WorkflowScript[]`, `isLoading: boolean`, `error: string | null`, `activeProfileId: string | null`, `activeProjectId: string | null`
  - [ ] 3.2 `fetchWorkflows(profileId, projectId)` — calls `list_workflows`, updates state
  - [ ] 3.3 `createWorkflow(profileId, projectId, name, description?)` — calls `create_workflow`, appends to `workflows`
  - [ ] 3.4 `renameWorkflow(profileId, workflowDocId, name)` — calls `rename_workflow`, updates item in `workflows`
  - [ ] 3.5 `deleteWorkflow(profileId, workflowDocId)` — calls `delete_workflow`, removes item from `workflows`
  - [ ] 3.6 `clearProfileData()` — resets to initial state (mirrors pattern in `useNodeStore`, `useLedgerStore`, etc.)
  - [ ] 3.7 All async actions dispatch errors to `useErrorStore.getState().dispatchError(msg)` on failure

- [ ] Task 4 — Create `src/features/nodeEditor/WorkflowScriptList.tsx` (AC: #1–#7, #9, #11)
  - [ ] 4.1 `useEffect` calls `fetchWorkflows(profileId, projectId)` on mount / when params change
  - [ ] 4.2 Skeleton loading state while `isLoading` is true
  - [ ] 4.3 Empty state with CTA when `workflows.length === 0` and not loading
  - [ ] 4.4 Workflow cards grid/list — each card: name (bold), description (muted, truncated), updatedAt date; clicking the card body navigates to `node-forge/:workflowDocId`
  - [ ] 4.5 "New Workflow" button → inline dialog or sheet with name + description fields; uses `react-hook-form` (matches `ProjectDashboard` pattern); submits to `createWorkflow`
  - [ ] 4.6 Rename: each card has an edit/pencil icon or dropdown menu item; opens a dialog pre-filled with current name; on confirm calls `renameWorkflow`
  - [ ] 4.7 Delete: each card has a trash icon or dropdown menu item; shows `window.confirm` or `AlertDialog` with "Delete workflow '{name}'?"; on confirm calls `deleteWorkflow`
  - [ ] 4.8 Style: follow `ProjectDashboard.tsx` patterns — `bg-zinc-50 dark:bg-zinc-950`, `border-zinc-200 dark:border-zinc-800`, emerald CTA buttons, `ScrollArea` wrapper

- [ ] Task 5 — Update routing in `src/App.tsx` (AC: #7, #8)
  - [ ] 5.1 Change existing route `path="project/:projectId/node-forge"` element to `<WorkflowScriptList />`
  - [ ] 5.2 Add new route `path="project/:projectId/node-forge/:workflowId"` element to `<NodeCanvas />`
  - [ ] 5.3 Import `WorkflowScriptList` from `./features/nodeEditor/WorkflowScriptList`

- [ ] Task 6 — Update `NodeCanvas` to use `workflowId` param (AC: #8)
  - [ ] 6.1 Change `useParams<{ projectId: string }>()` to `useParams<{ projectId: string; workflowId: string }>()`
  - [ ] 6.2 Use `workflowId` as `canvasId` when calling `loadCanvas(profileId, projectId, workflowId)` and `saveCanvas(profileId, projectId, workflowId, ...)`
  - [ ] 6.3 Update `useNodeStore.loadCanvas` and `saveCanvas` signatures to accept `workflowId: string` as the `canvasId` parameter — verify existing `save_canvas(db, canvasId, ...)` already accepts a string canvasId (it does)

- [ ] Task 7 — Update `AppShell.tsx` active state (AC: #9)
  - [ ] 7.1 Verify the sidebar "Node Forge" `onClick` already navigates to `/app/${profileId}/project/${projectId}/node-forge` — it does (line 266). No URL change needed.
  - [ ] 7.2 Confirm active highlight condition `location.pathname.includes('/node-forge')` also matches the new sub-route `/node-forge/:workflowId` — it does. No change needed.

- [ ] Task 8 — Clear workflow store on profile switch in `App.tsx` (AC: #11)
  - [ ] 8.1 Add `useWorkflowStore.getState().clearProfileData()` to the `useEffect` that clears profile data on `activeProfileId` change (same block that clears `useLedgerStore`, `useNodeStore`, etc.)

## Dev Notes

### Architecture Guardrails

- **Feature folder**: All new UI components go in `src/features/nodeEditor/`. Do NOT create a `src/features/workflows/` folder — Node Forge is one feature.
- **Store location**: `useWorkflowStore.ts` goes in `src/stores/` (not inside `src/features/nodeEditor/`). All Zustand stores live in `src/stores/`.
- **No Tauri commands**: This story uses only PouchDB via `src/lib/db.ts`. No `invoke()` calls needed.
- **Zustand pattern**: Use `create<State>()` with `subscribeWithSelector` middleware (matches all other stores). State transitions via `set(...)`, not `produce`.
- **Error dispatch**: Always `useErrorStore.getState().dispatchError(msg)` in catch blocks — never `console.error` alone.
- **clearProfileData()**: Every store that holds profile-scoped data must implement this. It's called in `App.tsx` on `activeProfileId` change.

### PouchDB Document Details

```typescript
// WorkflowScript document stored as "workflow:{uuid}"
interface WorkflowScript extends LedgyDocument {
  type: 'workflow';
  profileId: string;    // which profile this belongs to
  projectId: string;    // which project (scoped)
  name: string;         // user-visible name
  description?: string; // one-line, for FR45
  scope: 'project';     // 'profile' reserved for story 4.17
}
```

`list_workflows` query: use `db.queryDocuments<WorkflowScript>({ type: 'workflow', includeDeleted: false })` then filter in-memory by `projectId`. `queryDocuments` uses PouchDB `allDocs` with key-range `workflow:` → `workflow:\ufff0` and automatically excludes soft-deleted docs. This is the canonical pattern — do NOT call `db.getAllDocuments('workflow')` (it includes soft-deleted).

### Route Structure After This Story

```
/app/:profileId/project/:projectId/node-forge           → WorkflowScriptList (NEW)
/app/:profileId/project/:projectId/node-forge/:workflowId → NodeCanvas (EXISTING, re-routed)
```

`NodeCanvas` currently uses `projectId` as `canvasId`. After Task 6, it uses `workflowId`. This is a **breaking change** to the canvas load path — existing `canvas:${projectId}` documents will no longer be found. This is acceptable: no production data exists yet (epic 4 is new), and the stale canvas doc key `canvas:${projectId}` should not conflict since `canvasId` format changes to `canvas:workflow-{uuid}`.

### UI Component Reuse

- Use `Button`, `Input`, `Textarea`, `Label`, `Card`, `CardContent`, `CardHeader`, `ScrollArea`, `Skeleton` from `@/components/ui/` — all already installed.
- Use `Form`, `FormControl`, `FormField`, `FormItem`, `FormMessage` from `@/components/ui/form` + `react-hook-form` for create/rename forms (matches `ProjectDashboard.tsx`).
- Icons: `Plus`, `Trash2`, `ArrowRight`, `Pencil` from `lucide-react` (already installed).
- For delete confirmation: use `window.confirm(...)` to match existing `ProjectDashboard` pattern. Do NOT add `AlertDialog` unless it's already imported elsewhere in the feature — keep the diff small.

### Previous Story Context (from 3.16 / deferred-work.md)

- **W1–W6 in deferred-work.md** are known issues with `NodeCanvas` from the stale story 4-1. Do NOT fix them in this story — they are explicitly deferred to story 4.2 (React Flow Canvas Core & Viewport).
- **D1–D11** are undo/redo and flattening deferred issues — not relevant to workflow list management.
- The existing `NodeCanvas.tsx` has a `useParams<{ projectId: string }>()` — Task 6 extends this to also extract `workflowId`. Be surgical: only add `workflowId` extraction and update the `loadCanvas`/`saveCanvas` call sites.

### Store Integration Checklist

When `useWorkflowStore` is created, check `App.tsx` for the `useEffect` that calls `clearProfileData()` on multiple stores and add `useWorkflowStore.getState().clearProfileData()` there. Pattern is at line ~38:

```typescript
useEffect(() => {
  useLedgerStore.getState().clearProfileData();
  useNodeStore.getState().clearProfileData();
  useDashboardStore.getState().clearProfileData();
  useSyncStore.getState().clearProfileData();
  useUndoRedoStore.getState().clearAll();
  useWorkflowStore.getState().clearProfileData(); // ADD THIS
}, [activeProfileId]);
```

### Encryption Note

`WorkflowScript` documents contain only metadata (name, description, timestamps). They do NOT contain canvas data (nodes/edges). Do NOT encrypt them in this story. Canvas encryption is handled in `save_canvas`/`load_canvas` via the `encryptionKey` param — that remains unchanged.

### Out of Scope for This Story

- Canvas implementation changes beyond the `workflowId` param extraction (story 4.2)
- Profile-scoped cross-project workflows (`scope: 'profile'`) — story 4.17
- Workflow duplication/export
- Workflow ordering/drag-to-reorder
- Fix of any W1–W6 deferred canvas issues
