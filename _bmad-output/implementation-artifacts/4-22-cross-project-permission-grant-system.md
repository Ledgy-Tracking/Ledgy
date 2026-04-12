# Story 4.22: Cross-Project Permission Grant System

Status: backlog

<!--
Story Context: Splits from story 4.17 (Profile-Scoped Cross-Project Workflow Engine).
4.17 was a single story covering two distinct concerns: (FR46) the workflow hub UI + multi-project
ledger sourcing AND (FR47) the permission/scoping enforcement model. This story handles FR47 only.
Based on: Epic 4 Node Forge, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: FR47 — "profile-scoped workflows require explicit user permission grants per project at workflow creation time."
-->

## Story

As a Node Forge user creating a profile-scoped workflow,
I want to explicitly grant access to specific projects from the workflow creation dialog,
so that the system enforces that my workflow can only read from projects I've consciously permitted, preventing accidental cross-project data leakage.

**Story Points:** 5 (M) ~3-4 days
**Complexity:** Medium (permission grant UI + execution-time scoping enforcement + PouchDB document model extension)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] Profile-scoped workflow creation dialog includes a multi-select project permission grant step
- [ ] `WorkflowScript` document extended with `scope: 'profile'` variant and `grantedProjectIds: string[]`
- [ ] Execution runtime (4.18) enforces scoping: Ledger Source nodes in profile-scoped workflows only resolve data from `grantedProjectIds`
- [ ] Attempting to add a Ledger Source node for a non-granted project shows an inline permission error
- [ ] Permission grants can be edited post-creation from workflow settings
- [ ] Revoking a project grant disconnects all Ledger Source nodes sourcing that project (with user confirmation)
- [ ] No regressions in existing NodeCanvas functionality (stories 4.1-4.21 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: scoping enforcement 90%, grant mutation 85%
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 4-17 (Profile-Scoped Workflow Hub)** — MUST be complete. The profile workflow list and creation entry point are defined there.
- **Story 4-18 (Node Graph Execution Runtime)** — MUST be complete. Scoping enforcement is applied inside the execution runtime's Ledger Source evaluator.
- **Story 4-5 (Ledger Source Node)** — MUST be complete. Ledger Source nodes are the access points that must be scoped.

## Acceptance Criteria

### AC1: WorkflowScript Document Model Extension

**Given** a profile-scoped workflow is created  
**When** the `WorkflowScript` document is written to PouchDB  
**Then** the document uses a discriminated union extending the project-scoped type:

```typescript
type WorkflowScript = ProjectWorkflowScript | ProfileWorkflowScript;

interface ProjectWorkflowScript extends LedgyDocument {
  type: 'workflow';
  scope: 'project';
  profileId: string;
  projectId: string;          // single project
  name: string;
  description?: string;
  outputRegistry: Record<string, WorkflowOutputEntry>;
}

interface ProfileWorkflowScript extends LedgyDocument {
  type: 'workflow';
  scope: 'profile';
  profileId: string;
  projectId: null;             // not bound to any single project
  grantedProjectIds: string[]; // explicit permit list
  name: string;
  description?: string;
  outputRegistry: Record<string, WorkflowOutputEntry>;
}
```

### AC2: Permission Grant Dialog (Workflow Creation)

**Given** the user clicks "New Workflow" from the profile-scoped workflow hub (4.17)  
**When** the creation dialog opens  
**Then** it includes two steps:

**Step 1 — Name & Description** (same as project-scoped workflow)

**Step 2 — Grant Project Access:**
- Title: "Which projects can this workflow access?"
- Displays a list of all projects within the active profile (name + icon)
- Each project has a checkbox; at least one must be selected to proceed
- Warning banner: *"Only grant access to projects this workflow genuinely needs. Grants cannot be changed without disconnecting existing nodes."*
- CTA: "Create Workflow & Grant Access"

On confirm: creates `ProfileWorkflowScript` with `grantedProjectIds` = selected project IDs.

### AC3: Scoping Enforcement in Execution Runtime

**Given** a profile-scoped workflow is executing (via 4.18 runtime)  
**When** a `LedgerSourceNode` evaluator attempts to fetch data from a `projectId`  
**Then** the runtime checks:

```typescript
function isLedgerAccessPermitted(workflow: WorkflowScript, projectId: string): boolean {
  if (workflow.scope === 'project') return workflow.projectId === projectId;
  if (workflow.scope === 'profile') return workflow.grantedProjectIds.includes(projectId);
  return false;
}
```

- If `false`: `LedgerSourceNode.evaluate()` returns `null` outputs with error message: *"Access to project '{name}' not granted"*
- Node renders a red lock badge on canvas
- Execution continues for other non-blocked nodes (partial execution model from 4.18 AC3)

### AC4: Canvas-Time Permission Validation

**Given** the user drags a Ledger Source node from the palette (4.24) onto a profile-scoped workflow canvas  
**When** they select a ledger from a non-granted project in the node configuration  
**Then**:

- An inline error appears in the node: *"Project '{name}' is not in this workflow's grant list"*
- The node is disabled (cannot be connected) until a valid ledger is selected
- A helper link: "Manage project grants →" opens the workflow settings panel

### AC5: Post-Creation Grant Management

**Given** a profile-scoped workflow already exists  
**When** the user opens workflow settings from the canvas header  
**Then** a "Project Grants" section shows:

- List of currently granted projects (with icons)
- "Add Project" button — adds a project to `grantedProjectIds` (no node disruption)
- "Revoke Access" button per project — shows a confirmation: *"Revoking '{project}' will disconnect {N} Ledger Source node(s). Continue?"*
  - On confirm: removes `projectId` from `grantedProjectIds`, disconnects and marks affected nodes as errored

## Tasks / Subtasks

- [ ] Task 1 — Extend `WorkflowScript` type
  - [ ] 1.1 Add discriminated union (`ProjectWorkflowScript | ProfileWorkflowScript`) to `src/types/nodeEditor.ts`
  - [ ] 1.2 Update `create_workflow` in `db.ts` to handle both variants
  - [ ] 1.3 Update `useWorkflowStore` actions for profile-scoped creation

- [ ] Task 2 — Permission Grant Dialog in `src/features/nodeEditor/WorkflowCreationDialog.tsx`
  - [ ] 2.1 Two-step form: name/desc → project grant selection (only shown for profile-scoped)
  - [ ] 2.2 Project list loaded from `useProjectStore`
  - [ ] 2.3 Minimum one project validation

- [ ] Task 3 — Scoping enforcement in execution runtime
  - [ ] 3.1 `isLedgerAccessPermitted()` utility in `src/features/nodeEditor/execution/scopeGuard.ts`
  - [ ] 3.2 Check in `LedgerSourceNode.evaluator.ts` before data fetch
  - [ ] 3.3 Red lock badge on denied `LedgerSourceNode` component

- [ ] Task 4 — Grant management UI in workflow settings panel
  - [ ] 4.1 "Project Grants" section in `NodeCanvasHeader` or settings drawer
  - [ ] 4.2 Add project action — updates `grantedProjectIds` in PouchDB + store
  - [ ] 4.3 Revoke action — confirmation dialog + node disconnection logic

- [ ] Task 5 — Unit tests
  - [ ] 5.1 `isLedgerAccessPermitted()` for project-scoped and profile-scoped variants
  - [ ] 5.2 Grant revocation disconnects nodes correctly
  - [ ] 5.3 Minimum-one-project creation validation
