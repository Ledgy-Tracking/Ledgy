# Story 4.1: React Flow Canvas Core & Viewport

Status: ready-for-dev

## Story

As a ledger user,
I want a full-screen infinite React Flow canvas at the Node Forge route,
so that I can build and navigate visual node graphs without being constrained by screen size.

## Acceptance Criteria

1. **Canvas renders** — `<NodeCanvas />` fills the available panel area (`w-full h-full`) at route `/project/:projectId/node-forge` with no layout overflow or scrollbars.
2. **Viewport persists** — After panning or zooming, the viewport (`x`, `y`, `zoom`) is saved to PouchDB via `save_canvas` and restored on re-mount from `load_canvas`.
3. **Debounced save** — Canvas state (nodes, edges, viewport) is saved no more than once per 1 second of inactivity after a change. No save occurs during active dragging or zooming.
4. **Stale store deleted** — `src/features/nodeEditor/useNodeStore.ts` (localStorage-based scaffold) and `src/features/nodeEditor/useNodeStore.test.ts` are removed. No code imports from this path.
5. **Type-safe React Flow state** — `rfNodes` and `rfEdges` in `NodeCanvas.tsx` use `CanvasNode[]` and `CanvasEdge[]` types from `src/types/nodeEditor.ts`. No `as unknown as` casts on these arrays.
6. **Unit tests** — `src/stores/useNodeStore.test.ts` exists and covers: initial state, `setNodes`, `setEdges`, `setViewport`, `updateNodeData`, `clearProfileData`. The `loadCanvas` and `saveCanvas` actions are covered with PouchDB mocked.
7. **TypeScript clean** — `npx tsc --noEmit` passes with zero new errors after all changes.

## Tasks / Subtasks

- [ ] Task 1 — Delete stale localStorage-based store (AC: #4)
  - [ ] 1.1 Delete `src/features/nodeEditor/useNodeStore.ts` (localStorage store — superseded by `src/stores/useNodeStore.ts`)
  - [ ] 1.2 Delete `src/features/nodeEditor/useNodeStore.test.ts` (tests the deleted store)
  - [ ] 1.3 Verify no imports of `../../features/nodeEditor/useNodeStore` or `./useNodeStore` from the nodeEditor feature folder remain; fix any if found

- [ ] Task 2 — Fix type casts in `NodeCanvas.tsx` (AC: #5)
  - [ ] 2.1 Change `const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([])` to `useNodesState<CanvasNode>([])`; import `CanvasNode` from `../../types/nodeEditor`
  - [ ] 2.2 Change `const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])` to `useEdgesState<CanvasEdge>([])`; import `CanvasEdge` from `../../types/nodeEditor`
  - [ ] 2.3 Remove `as unknown as Node[]`, `as unknown as Edge[]`, `as unknown as CanvasNode[]`, and `as any` casts from `setRfNodes`, `setRfEdges`, and `saveCanvas` call sites
  - [ ] 2.4 Run `npx tsc --noEmit` and fix any new type errors introduced

- [ ] Task 3 — Reduce debounce from 3s to 1s (AC: #3)
  - [ ] 3.1 In `NodeCanvas.tsx`, change the `setTimeout` delay from `3000` to `1000`
  - [ ] 3.2 Update the comment to reflect the 1-second debounce

- [ ] Task 4 — Write unit tests for `src/stores/useNodeStore.ts` (AC: #6)
  - [ ] 4.1 Create `src/stores/useNodeStore.test.ts`
  - [ ] 4.2 Mock `src/lib/db` (`getProfileDb`, `save_canvas`, `load_canvas`) and `src/features/auth/useAuthStore` using `vi.mock`
  - [ ] 4.3 Test: initial state has `nodes: []`, `edges: []`, `viewport: { x:0, y:0, zoom:1 }`, `isLoading: false`, `error: null`
  - [ ] 4.4 Test: `setNodes([...])` updates nodes in store
  - [ ] 4.5 Test: `setEdges([...])` updates edges in store
  - [ ] 4.6 Test: `setViewport({x:100, y:200, zoom:1.5})` updates viewport in store
  - [ ] 4.7 Test: `updateNodeData('id', { label: 'new' })` merges data into matching node
  - [ ] 4.8 Test: `clearProfileData()` resets all state back to initial values
  - [ ] 4.9 Test: `loadCanvas` — when `load_canvas` mock returns a canvas doc, nodes/edges/viewport are set; when it returns null, state falls back to empty defaults
  - [ ] 4.10 Test: `saveCanvas` — calls `save_canvas` with correct args when `isUnlocked: true`; returns early when `isUnlocked: false`

## Dev Notes

### Critical Context: What Already Exists

**NodeCanvas.tsx is substantially scaffolded.** Do NOT reinvent it. The file at `src/features/nodeEditor/NodeCanvas.tsx` already has:
- `<ReactFlow>` with `Background`, `Controls`, `MiniMap` (MiniMap appears only when nodes > 0)
- `onViewportChange` → `useNodeStore.getState().setViewport(vp)` (passive, no re-render)
- `onSelectionChange` → `useUIStore.setSelectedNodeId` + `setRightInspector`
- `isValidConnection` — matches `sourceHandle`/`targetHandle` type segments (split by `-`)
- `panActivationKeyCode="Space"`, `selectionKeyCode="Shift"`
- Stable node/edge types registered outside component to prevent re-render loops
- `loadedRef` guard to prevent double-load on re-renders

**src/stores/useNodeStore.ts is the canonical store.** It uses `subscribeWithSelector` middleware, `applyNodeChanges`/`applyEdgeChanges` from React Flow, and persists to PouchDB via `save_canvas`/`load_canvas` from `src/lib/db.ts`. The `NodeCanvas.tsx` imports from `'../../stores/useNodeStore'`.

**The stale store** at `src/features/nodeEditor/useNodeStore.ts` uses `localStorage` (a scaffold from Story 1.3). It has an incompatible API (`addNode`, `updateNodePosition`, `saveGraph`, `loadGraph`) and its test file tests localStorage behavior. Both files must be deleted.

### Architecture Guardrails

- **No local `useState` for async layers** — `isLoading`, `error` live in `useNodeStore` (architecture.md:244). Do not add local loading state in NodeCanvas.
- **Zustand store owns domain state** — nodes, edges, viewport live in `useNodeStore`. React Flow's local `useNodesState`/`useEdgesState` are used for **rendering performance** only (React Flow internal changes like position deltas don't cause a Zustand write on every pixel move — only the debounced save does).
- **Cross-render stability** — `nodeTypes`, `edgeTypes`, `defaultEdgeOptions` are defined outside the component. Do NOT move them inside.
- **No PouchDB reads in React Flow callbacks** — `onNodesChange`, `onEdgesChange`, `onConnect` must not call any async DB function. All DB writes are deferred to the debounced `saveCanvas` effect.
- **`useReactFlow()` children** — `NodeToolbar` uses `useReactFlow()` and is rendered inside `<ReactFlow>` as a child panel element, which provides the context. This is correct — do not add an extra `<ReactFlowProvider>` wrapper.

### Files to Delete

- `src/features/nodeEditor/useNodeStore.ts` — stale localStorage scaffold
- `src/features/nodeEditor/useNodeStore.test.ts` — tests the deleted file

### Files to Modify

- `src/features/nodeEditor/NodeCanvas.tsx` — fix type casts (Task 2), reduce debounce to 1s (Task 3)

### Files to Create

- `src/stores/useNodeStore.test.ts` — unit tests for the canonical store (Task 4)

### Existing Code Patterns (DO NOT REINVENT)

- `save_canvas` at `src/lib/db.ts:1329` — signature: `save_canvas(db, canvasId, nodes, edges, viewport, profileId, encryptionKey?)`
- `load_canvas` at `src/lib/db.ts:1385` — signature: `load_canvas(db, canvasId, encryptionKey?)` → returns `NodeCanvas | null`
- `getProfileDb(profileId)` in `src/lib/db.ts` — returns the PouchDB instance for a profile
- `useAuthStore` at `src/features/auth/useAuthStore.ts` — `isUnlocked: boolean`, `encryptionKey: CryptoKey | null`
- Test mocking pattern: see `src/stores/useSyncStore.test.ts` for how `vi.mock('../lib/db', ...)` is structured

### Testing Standards

- Vitest + co-located test files (`useNodeStore.test.ts` next to `useNodeStore.ts` in `src/stores/`)
- `describe`/`it` blocks — no `test()` blocks (project convention)
- Call `useNodeStore.getState().clearProfileData()` in `beforeEach` to reset state between tests
- Mock `src/lib/db` at the module level; mock `src/features/auth/useAuthStore` to control `isUnlocked`/`encryptionKey`

### Previous Story Intelligence (Story 3.16)

- **Pattern confirmed**: Pure logic in `src/lib/`, React integration in `src/features/`, global stores in `src/stores/`
- **Pattern confirmed**: Co-located tests (`{file}.test.ts` next to `{file}.ts`)
- **Pattern confirmed**: `vi.mock` at module level in test files for external dependencies (PouchDB, auth state)

### Architecture Reference

- React Flow integration: `architecture.md:95` — "Node Editor: React Flow (`@xyflow/react`)"
- Store pattern: `architecture.md:243` — `{ isLoading, error, ...stateFields, ...actions }`
- Feature directory: `architecture.md:319` — `src/features/nodeEditor/` = Visual Scripting (FR5–7)
- No local useState for async layers: `architecture.md:244` (project-context.md also confirms this)
- Performance target: 60fps node editor (`architecture.md:437`)

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

### Review Findings

_To be filled by code review agent_

## Change Log

- 2026-04-07: Story created by claude-sonnet-4-6 (create-story workflow).
