# Story 1.2: React Router & Error Boundaries

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **the application to have a global routing shell with comprehensive error boundaries**,
so that **I can access protected features securely and recover gracefully from errors without losing my work or crashing the application**.

## Acceptance Criteria

1. React Router v7 is installed and configured
2. Global routing shell is set up with basic route structure for Epic 1 (auth, settings, future features)
3. Error boundaries are implemented at multiple levels (route-level and app-level)
4. Error boundaries delegate to the global `<ErrorToast />` component
5. Unauthenticated users are redirected to `/unlock` screen
6. Basic route structure prepared for three-panel shell layout (Story 1.4 will implement full layout)
7. All routes are protected except `/setup` and `/unlock`
8. Error toast notifications display user-friendly error messages
9. TypeScript strict mode compiles without errors
10. Unit tests cover error boundary behavior

## Tasks / Subtasks

- [ ] Task 1: Install and configure React Router v7
  - [ ] Install `react-router-dom@^7.0.0`
  - [ ] Set up router configuration in `src/App.tsx`
  - [ ] Create basic route structure for auth flow
- [ ] Task 2: Implement global error boundaries
  - [ ] Create `ErrorBoundary` component using React error boundary API
  - [ ] Implement route-level error boundaries
  - [ ] Implement app-level error boundary
  - [ ] Connect error boundaries to `<ErrorToast />` component
- [ ] Task 3: Set up authentication guard routing
  - [ ] Create `<AuthGuard />` component wrapper
  - [ ] Protect all routes except `/setup` and `/unlock`
  - [ ] Implement redirect logic to `/unlock` for unauthenticated users
- [ ] Task 4: Create basic page components for routing structure
  - [ ] Create placeholder pages for future features (Dashboard, Settings, Ledger)
  - [ ] Set up route structure for three-panel shell layout (layout implementation in Story 1.4)
  - [ ] Implement basic navigation structure
- [ ] Task 5: Write unit tests for error boundaries and auth guard
  - [ ] Test error boundary catches and displays errors
  - [ ] Test auth guard redirects unauthenticated users
  - [ ] Test error toast integration

## Dev Notes

### Critical Technical Requirements

**React Router Version**: Must use React Router v7 (not v6 or v5) - check `package.json`

**Error Boundary Pattern** (per architecture.md):
```typescript
// Error boundaries must delegate to global ErrorToast
// No local useState for error handling - use useErrorStore
```

**Auth Guard Pattern** (per architecture.md):
```typescript
// All routes except /setup and /unlock must be wrapped in <AuthGuard />
// AuthGuard checks useAuthStore().isUnlocked before rendering
```

### Project Structure Notes

**IMPORTANT**: Follow the architecture.md project structure:

```
src/
├── App.tsx                    # Root router + AuthGuard
├── features/
│   ├── auth/
│   │   ├── AuthGuard.tsx      # Route protection wrapper
│   │   ├── UnlockPage.tsx     # TOTP unlock screen
│   │   └── useAuthStore.ts    # Auth state management
│   └── shell/
│       ├── ShellLayout.tsx    # Three-panel layout wrapper
│       └── ErrorBoundary.tsx  # Global error boundary
├── components/
│   └── ErrorToast.tsx         # Global error display
└── stores/
    └── useErrorStore.ts       # Global error state
```

**Alignment with unified project structure**:
- Feature folders use `camelCase` naming: `src/features/auth/`, `src/features/shell/`
- Components use `PascalCase`: `AuthGuard.tsx`, `ErrorBoundary.tsx`
- Hooks use `useCamelCase`: `useAuthStore.ts`, `useErrorStore.ts`
- Tests are co-located: `AuthGuard.test.tsx` next to `AuthGuard.tsx`

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Naming**: `camelCase` for TypeScript variables, `PascalCase` for components, `snake_case` for Rust commands
- **Structure**: Feature-first organization in `src/features/{name}/`
- **Tests**: Co-located with source files
- **Styling**: Tailwind CSS utility-first, no ad-hoc CSS unless necessary
- **Error Handling**: Errors caught → dispatched to `useErrorStore` → displayed via `<ErrorToast />`
- **Auth Gate**: All routes except `/setup` and `/unlock` wrapped in `<AuthGuard />` checking `useAuthStore().isUnlocked`

### Library/Framework Requirements

**Core Dependencies** (already installed from Story 1.1):
- `react`: ^19.0.0
- `react-dom`: ^19.0.0
- `react-router-dom`: ^7.0.0 (install for this story)
- `zustand`: Latest stable
- `tailwindcss`: Latest
- `vite`: Latest
- `vitest`: Latest (for unit testing)

**DO NOT install yet** (will be added in later stories):
- PouchDB (Story 1.5)
- WebCrypto utilities (Story 1.7)
- TOTP libraries (Story 1.6)

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located with source files: `src/features/auth/AuthGuard.test.tsx`, `src/features/shell/ErrorBoundary.test.tsx`
- Use Vitest's built-in integration with Vite
- Mock Zustand stores for isolated testing

**Critical Test Scenarios** (High-Risk Components):
1. ✅ Error boundary catches component render errors
2. ✅ Error boundary catches route-level errors
3. ✅ Error toast integration displays error message
4. ✅ Auth guard redirects unauthenticated users to `/unlock`
5. ✅ Auth guard allows authenticated users through to protected routes

### Git Branch Strategy

**Branch Decision**: Using `allatonce` branch for all epic implementation work (user preference).

**Rationale**: Consolidates all epic stories onto a single branch for streamlined development and easier integration, rather than creating separate `epic/epic-1` branch.

```bash
# Working on consolidated branch
git checkout allatonce
```

All stories in Epic 1 (1-1 through 1-11) are implemented on this branch.

### References

- [Source: architecture.md#Selected Starter: Tauri 2.0 + React + TypeScript + Vite + Tailwind CSS](planning-artifacts/architecture.md)
- [Source: architecture.md#Complete Project Directory Structure](planning-artifacts/architecture.md)
- [Source: architecture.md#Frontend Architecture](planning-artifacts/architecture.md)
- [Source: architecture.md#Communication Patterns](planning-artifacts/architecture.md)
- [Source: architecture.md#Process Patterns](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: project-context.md#Critical Implementation Rules](project-context.md)
- [Source: epics.md#Epic 1: App Foundation & Core Security](planning-artifacts/epics.md)
- [Source: 1-1-scaffold-dependency-tree.md#Git Branch Strategy](implementation-artifacts/1-1-scaffold-dependency-tree.md)

## Dev Agent Record

### Agent Model Used

Context generated by BMad Method create-story workflow

### Debug Log References

### Completion Notes List

### File List

---

## Technical Requirements

### Mandatory Implementation Standards

1. **Use existing git branch**: You MUST work on the `allatonce` branch (consolidated epic branch).

2. **Error handling pattern**: All errors MUST be routed through `useErrorStore` and displayed via `<ErrorToast />` - no local error state.

3. **Auth guard coverage**: ALL routes except `/setup` and `/unlock` MUST be protected by `<AuthGuard />`.

4. **No telemetry**: Absolutely NO analytics libraries or external SDK telemetry injections (per project-context.md).

5. **TypeScript strict mode**: All code must compile without TypeScript errors in strict mode.

### Next Steps

After completing this story:
1. Commit all changes to `allatonce` branch
2. Update sprint-status.yaml to mark this story as "done"
3. Proceed to Story 1.3: Zustand Store Topology
