# Story 5.0: Dashboard Brownfield Reconciliation

Status: backlog

<!--
Story Context: Pre-requisite for all other Epic 5 stories.
Existing dashboard code discovered during Party Mode sprint review 2026-04-13.
The existing implementation has critical defects that must be resolved before any Epic 5 story can build safely.

Files audited:
  src/features/dashboard/Dashboard.tsx         — shell (OK, thin wrapper)
  src/features/dashboard/DashboardView.tsx     — main view (calls non-existent fetchWidgets, type mismatch)
  src/features/dashboard/useDashboardStore.ts  — store in features/ (has fetchWidgets/saveWidgets)
  src/stores/useDashboardStore.ts              — store in stores/ (has loadDashboard/saveDashboard, localStorage)
  src/features/dashboard/WidgetConfigSheet.tsx — config UI (only DashboardOutputNode binding, no direct ledger)
  src/features/nodeEditor/nodes/DashboardOutputNode.tsx — output node (wrong-direction store dependency)

Defects found:
  [CRITICAL] Two separate useDashboardStore files with diverged APIs — store/view contract broken
  [CRITICAL] DashboardView calls fetchWidgets() which doesn't exist in stores/useDashboardStore.ts → runtime crash
  [CRITICAL] localStorage persistence — PouchDB TODO from "Story 1.5" never completed
  [HIGH]     Widget / WidgetConfig type mismatch between store and view
  [HIGH]     DashboardOutputNode binds by React Flow node ID — breaks on canvas reload
  [HIGH]     DashboardOutputNode calls useDashboardStore.updateWidget() from inside node — wrong-direction dependency
  [MED]      Dead enum values: 'metric' and 'table' widget types declared but never rendered
-->

## Story

As the development team,
I want to consolidate and repair the existing dashboard scaffolding before building Epic 5 features,
so that all subsequent dashboard stories build on a stable, PouchDB-backed, type-consistent foundation.

**Story Points:** 5 (M) ~3-4 days
**Complexity:** Medium (no new features — pure consolidation, type unification, persistence migration)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] Single canonical `useDashboardStore` at `src/stores/useDashboardStore.ts` — no duplicate store files
- [ ] Single canonical `WidgetConfig` type at `src/types/dashboard.ts` — used consistently across store, view, and widgets
- [ ] Dashboard layout persists to and loads from PouchDB (not localStorage)
- [ ] `DashboardView` no longer crashes on mount (`fetchWidgets` call resolved)
- [ ] `DashboardOutputNode` no longer calls `useDashboardStore` directly — dependency direction fixed
- [ ] Dead widget types (`metric`, `table`) removed from `Widget` type union
- [ ] All existing widget rendering (ChartWidget, TrendWidget, TextWidget) still works after reconciliation
- [ ] Existing dashboard layouts migrated from localStorage to PouchDB on first load (one-time migration)
- [ ] Code review completed and approved by Tech Lead
- [ ] All existing `useDashboardStore.test.ts` tests pass
- [ ] New unit tests for PouchDB load/save round-trip
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 3-1 (PouchDB Document Adapters)** — MUST be complete. PouchDB write/read patterns required.
- **Story 1-9 (Global App Settings Store)** — MUST be complete. Store pattern to follow.

## Acceptance Criteria

### AC1: Single Canonical Dashboard Store

**Given** there are currently two `useDashboardStore` files  
**When** this story is complete  
**Then** there is exactly one store at `src/stores/useDashboardStore.ts` with this API:

```typescript
interface DashboardStore {
  widgets: WidgetConfig[];
  isLoading: boolean;
  error: string | null;

  fetchWidgets(profileId: string, dashboardId: string): Promise<void>;
  saveWidgets(profileId: string, widgets: WidgetConfig[], dashboardId: string): Promise<void>;
  addWidget(widget: WidgetConfig): void;
  removeWidget(widgetId: string): void;
  updateWidget(widgetId: string, updates: Partial<WidgetConfig>): void;
  clearProfileData(): void;
}
```

`src/features/dashboard/useDashboardStore.ts` is deleted. All imports updated to point to `src/stores/useDashboardStore.ts`.

### AC2: Single Canonical WidgetConfig Type

**Given** two incompatible widget type shapes exist  
**When** this story is complete  
**Then** `src/types/dashboard.ts` exports the single canonical type:

```typescript
export interface WidgetConfig {
  id: string;
  type: 'chart' | 'trend' | 'text';  // 'metric' and 'table' removed
  title: string;
  position: { x: number; y: number; w: number; h: number };
  nodeId?: string;                    // existing Node Forge binding (temporary, replaced by 4.21)
  data?: {
    value?: number;
    chartData?: Array<{ name: string; value: number }>;
    trend?: 'up' | 'down' | 'neutral';
    changePercent?: number;
    subtitle?: string;
  };
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}
```

`useDashboardStore.Widget` type is deleted. All references updated to `WidgetConfig`.

### AC3: PouchDB Persistence

**Given** the dashboard currently uses `localStorage`  
**When** `fetchWidgets(profileId, dashboardId)` is called  
**Then**:

- Reads from PouchDB document: `{ _id: "dashboard:{dashboardId}", type: "dashboard", profileId, widgets: WidgetConfig[] }`
- On first load: if no PouchDB document found, checks `localStorage.getItem('ledgy-dashboard')` and migrates the data to PouchDB (one-time migration, then deletes localStorage key)
- `saveWidgets` writes the full `widgets` array back to the PouchDB document using `updateDocument`
- Follows the same error handling pattern as other stores (dispatch to `useErrorStore`)

### AC4: DashboardView Mount Fix

**Given** `DashboardView` currently crashes calling `fetchWidgets` (not found in old store)  
**When** this story is complete  
**Then**:

- `DashboardView` imports from `src/stores/useDashboardStore`
- `fetchWidgets(profileId, dashboardId)` is defined and functional in the store
- Dashboard loads without runtime error on mount

### AC5: DashboardOutputNode Dependency Direction Fix

**Given** `DashboardOutputNode` calls `useDashboardStore.updateWidget()` from inside the node component  
**When** this story is complete  
**Then**:

- `DashboardOutputNode` no longer imports or calls `useDashboardStore`
- The node only manages its own React Flow node data via `useNodeStore.updateNodeData()`
- The `widgetId` stored in node data remains for backward compatibility — the actual dashboard update when a `widgetId` is present is handled by a `useEffect` in `DashboardView` that watches `nodes` for `dashboardOutput` type changes (pulls, not pushes)
- This inverts the dependency: Dashboard reads from Node Store; Node Store doesn't write to Dashboard Store

### AC6: Dead Code Removal

**Given** `metric` and `table` widget types are declared but never rendered  
**When** this story is complete  
**Then**:

- `Widget.type` union is `'chart' | 'trend' | 'text'` only
- Any `case 'metric':` or `case 'table':` branches removed
- `WidgetConfigSheet` type selector updated to match

## Tasks / Subtasks

- [ ] Task 1 — Audit all dashboard imports across the codebase
  - [ ] 1.1 `grep -r "useDashboardStore" src/` — list all import sites
  - [ ] 1.2 `grep -r "WidgetConfig\|Widget'" src/features/dashboard` — list all type usage
  - [ ] 1.3 Document which files need updating

- [ ] Task 2 — Unify store: merge `src/features/dashboard/useDashboardStore.ts` → `src/stores/useDashboardStore.ts`
  - [ ] 2.1 Implement `fetchWidgets(profileId, dashboardId)` with PouchDB read + localStorage migration
  - [ ] 2.2 Implement `saveWidgets(profileId, widgets, dashboardId)` with PouchDB write
  - [ ] 2.3 Remove `loadDashboard`/`saveDashboard` (localStorage versions)
  - [ ] 2.4 Delete `src/features/dashboard/useDashboardStore.ts`
  - [ ] 2.5 Update all import sites

- [ ] Task 3 — Unify types: canonicalize `WidgetConfig` in `src/types/dashboard.ts`
  - [ ] 3.1 Define final `WidgetConfig` shape (AC2)
  - [ ] 3.2 Remove `Widget` type from store
  - [ ] 3.3 Update `DashboardView`, `WidgetConfigSheet`, `widgets/index.ts` to use `WidgetConfig`
  - [ ] 3.4 Remove `metric` and `table` from type union and any switch branches

- [ ] Task 4 — Fix `DashboardOutputNode` dependency direction (AC5)
  - [ ] 4.1 Remove `useDashboardStore` import from `DashboardOutputNode.tsx`
  - [ ] 4.2 Remove `handleWidgetTypeChange` calling `updateWidget`
  - [ ] 4.3 Add `useEffect` in `DashboardView` watching `nodes` for `dashboardOutput` changes

- [ ] Task 5 — localStorage → PouchDB migration
  - [ ] 5.1 One-time migration in `fetchWidgets`: check localStorage, write to PouchDB, clear localStorage key
  - [ ] 5.2 Unit test: migration runs once, localStorage cleared after

- [ ] Task 6 — Update and add tests
  - [ ] 6.1 Fix existing `useDashboardStore.test.ts` to use new API
  - [ ] 6.2 Add PouchDB load/save round-trip test
  - [ ] 6.3 Smoke test: `DashboardView` mounts without crash
