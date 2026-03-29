---
title: 'Remediate Shadcn Violations'
slug: 'remediate-shadcn-violations'
created: '2026-03-29'
status: 'review'
stepsCompleted: [1, 2, 3]
tech_stack: ['React', 'TypeScript', 'shadcn/ui', 'Vitest']
files_to_modify: 
  - 'src/components/ui/EmptyState.tsx'
  - 'src/components/ui/EmptyState.test.tsx'
  - 'src/components/ui/LoadingSkeleton.tsx'
  - 'src/components/ui/LoadingSkeleton.test.tsx'
  - 'package.json'
code_patterns: ['Component Refactoring', 'File System Operations']
test_patterns: ['Component-level unit tests']
---

# Tech-Spec: Remediate Shadcn Violations

**Created:** 2026-03-29

## Overview

### Problem Statement

The project contains custom UI components located in the `src/components/ui` directory, which is reserved for genuine shadcn components. Additionally, there is likely widespread incorrect usage of the shadcn library throughout the codebase, preventing a clean baseline for UI consistency. The `shadcn-doctor` tool has identified initial issues but could not complete a full scan.

### Solution

Systematically remediate all shadcn violations reported by the `npx shadcn-doctor` tool. The process involves two phases:
1.  **Phase 1 (Initial Cleanup):** Relocate the identified non-genuine components from the `src/components/ui` directory to a more appropriate location (`src/components/common`) to allow the `shadcn-doctor` scan to run without conflicts.
2.  **Phase 2 (Full Remediation):** Run the `npx shadcn-doctor` tool to completion, capture all reported violations, and create a task list to fix each one until the tool passes with zero errors.

### Scope

**In Scope:**
- Relocating `EmptyState` and `LoadingSkeleton` components.
- Updating all import paths that reference the moved components.
- Adding a script to `package.json` to easily run `shadcn-doctor`.
- Executing the full `shadcn-doctor` scan.
- Fixing all violations reported by the completed scan.

**Out of Scope:**
- CI/CD integration and pre-commit hooks.
- Creating new features or components.
- Refactoring components beyond what is required to fix `shadcn-doctor` errors.

## Context for Development

### Codebase Patterns

- **Component Structure:** Standard React component patterns are used. Components are typically co-located with their tests (e.g., `Component.tsx` and `Component.test.tsx`).
- **UI Component Directory:** `src/components/ui` is managed by the `shadcn/ui` CLI and should only contain components installed via that tool. Custom-built, shared components should reside elsewhere, such as `src/components/common`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/ui/EmptyState.tsx` | Non-genuine shadcn component to be moved. |
| `src/components/ui/LoadingSkeleton.tsx` | Non-genuine shadcn component to be moved. |
| `package.json` | Will be updated with a new `doctor` script. |
| `tsconfig.json` | May need path alias updates if a new component directory is created. |

### Technical Decisions

- The non-genuine components will be moved to a new directory: `src/components/common/`. This clearly separates them from shadcn-managed files.
- A dedicated npm script (`npm run doctor`) will be created to standardize the execution of `shadcn-doctor`.

## Implementation Plan

### Tasks

- [ ] **Task 1: Create `common` components directory**
  - File: `src/components/common/`
  - Action: Create a new directory to house shared, non-shadcn UI components.
- [ ] **Task 2: Move `EmptyState` component**
  - Action: Move `src/components/ui/EmptyState.tsx` and `src/components/ui/EmptyState.test.tsx` to `src/components/common/`.
- [ ] **Task 3: Move `LoadingSkeleton` component**
  - Action: Move `src/components/ui/LoadingSkeleton.tsx` and `src/components/ui/LoadingSkeleton.test.tsx` to `src/components/common/`.
- [ ] **Task 4: Update all import paths**
  - Action: Perform a global search for imports pointing to the old paths (`@/components/ui/EmptyState`, `@/components/ui/LoadingSkeleton`) and update them to point to the new location (`@/components/common/...`).
- [ ] **Task 5: Add `doctor` script to `package.json`**
  - File: `package.json`
  - Action: Add a new script: `"doctor": "npx shadcn-doctor"`.
- [ ] **Task 6: Run full `shadcn-doctor` scan**
  - Action: Execute `npm run doctor` and save the complete output to a log file for analysis.
- [ ] **Task 7: Remediate all reported violations**
  - Action: Based on the output from Task 6, create and execute a sub-task list to fix every reported violation. This will involve replacing custom elements (`<button>`, `<div>`) with the appropriate shadcn components (`<Button>`, `<Card>`).

### Acceptance Criteria

- [ ] **AC 1:** Given the `EmptyState` and `LoadingSkeleton` components are moved, when the application is run, then all features using these components function as expected without broken imports.
- [ ] **AC 2:** Given the `doctor` script is added to `package.json`, when `npm run doctor` is executed, then the `shadcn-doctor` scan runs successfully.
- [ ] **AC 3:** Given all remediation tasks are complete, when `npm run doctor` is executed, then the command exits with a success code and reports "✅ No shadcn violations found."

## Additional Context

### Dependencies

- Requires `shadcn-doctor` to be available via `npx`.

### Testing Strategy

- After moving components and updating imports (Task 4), run the existing test suite (`npm test`) to ensure no regressions were introduced. The primary verification for this entire spec is the successful, error-free execution of the `shadcn-doctor` tool itself.

### Notes

The full scope of Task 7 is unknown until Task 6 is complete. The developer executing this spec will need to analyze the `shadcn-doctor` report to define the sub-tasks for remediation.
