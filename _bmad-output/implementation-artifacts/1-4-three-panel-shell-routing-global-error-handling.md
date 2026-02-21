# Story 1.4: Three-Panel Shell, Routing & Global Error Handling

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a consistent three-panel application shell with routing,
So that I can navigate between areas of the app without disorientation.

## Acceptance Criteria

1. **Given** the user is authenticated
   **When** the app renders
   **Then** the three-panel shell displays: left sidebar (240px, collapsible to 48px icon rail), main canvas (flex), right inspector (280px, collapsible)
2. **And** React Router v7 is configured with routes for `/unlock`, `/setup`, `/profiles`, and `/app/:profileId/*`
3. **And** a global `<ErrorToast />` component is rendered and wired to `useErrorStore` — all async errors surface here without local `useState` error handling in components
4. **And** the layout responds correctly at all window-width breakpoints:
   - ≥1280px: Full three-panel (Sidebar + Main + Inspector)
   - 1100–1279px: Inspector auto-collapsed (Sidebar + Main)
   - 900–1099px: Both panels collapsible (Main only, toggles for others)
   - <900px: Warning banner shown ("Mobile/Tablet layout not supported in this version")
5. **And** a light/dark theme toggle is wired to a CSS class on the root element, defaulting to dark mode

## Tasks / Subtasks

- [ ] Task 1 (AC: 3): Implement Global Error Handling
  - [ ] Subtask 1.1: Create `src/stores/useErrorStore.ts` with `error` state and `dispatchError` / `clearError` actions.
  - [ ] Subtask 1.2: Create `src/components/ErrorToast.tsx` using Shadcn `Toast` or custom implementation, subscribed to `useErrorStore`.
  - [ ] Subtask 1.3: Add `ErrorToast` to `src/App.tsx` (global level).
  - [ ] Subtask 1.4: Add tests in `tests/useErrorStore.test.ts`.
- [ ] Task 2 (AC: 1, 4, 5): Implement App Shell Layout
  - [ ] Subtask 2.1: Create `src/components/Layout/AppShell.tsx`.
  - [ ] Subtask 2.2: Implement Left Sidebar (Collapsible, Width transition).
  - [ ] Subtask 2.3: Implement Right Inspector (Collapsible, Width transition).
  - [ ] Subtask 2.4: Implement Main Canvas area (Flex grow).
  - [ ] Subtask 2.5: Implement Responsive Logic (Breakpoints) and Warning Banner for <900px.
  - [ ] Subtask 2.6: Implement Theme Toggle (Dark/Light) and persistence in `useUIStore` or similar.
  - [ ] Subtask 2.7: Add component tests in `tests/AppShell.test.tsx`.
- [ ] Task 3 (AC: 2): Configure Routing
  - [ ] Subtask 3.1: Update `src/App.tsx` to use React Router v7.
  - [ ] Subtask 3.2: Define routes:
    - `/` -> Redirect to `/profiles` (or `/unlock` via AuthGuard)
    - `/unlock` (Public/Guard logic)
    - `/setup` (Public)
    - `/profiles` (Protected)
    - `/app/:profileId/*` (Protected, uses AppShell)
  - [ ] Subtask 3.3: Ensure `AuthGuard` wraps protected routes correctly.
  - [ ] Subtask 3.4: Add integration tests for routing in `tests/App.test.tsx`.

## Dev Notes

- **Relevant architecture patterns and constraints**:
  - **State Management**: Use `zustand` for `useErrorStore` and UI state (sidebar/theme).
  - **Styling**: Tailwind CSS (`zinc-950` base, `emerald-500` accent). Use `transition-all duration-300` for smooth collapsing.
  - **Routing**: React Router v7. Use nested routes for the shell layout (`/app/:profileId` renders Shell, children render inside Main Canvas).
  - **Error Handling**: **Strictly no local `useState` for async errors.** Always dispatch to `useErrorStore`.
- **Source tree components to touch**:
  - `src/App.tsx`: Layout composition and routing.
  - `src/stores/useErrorStore.ts`: New store.
  - `src/components/ErrorToast.tsx`: New component.
  - `src/components/Layout/AppShell.tsx`: New component.
  - `src/features/dashboard/Dashboard.tsx`: Ensure it renders within the shell.
- **Testing standards summary**:
  - **Location**: ALL test files MUST reside in the `/tests` directory at the project root. Do not co-locate tests with source files.
  - **Framework**: Vitest for unit/integration.
  - **Coverage**: Test responsive behavior (mock window.innerWidth or use viewport helpers if using Playwright, or simple unit tests for logic).

### Project Structure Notes

- **Alignment**:
  - `src/components/Layout/` aligns with "Shared UI components must reside in `src/components/`".
  - `src/stores/` aligns with "Zustand stores per domain".
- **Detected conflicts or variances**:
  - Ensure `AppShell` handles the Profile context correctly (reading `profileId` from URL).

### References

- [Source: planning-artifacts/epics.md#Story 1.4: Three-Panel Shell, Routing & Global Error Handling]
- [Source: planning-artifacts/architecture.md#Frontend Architecture]
- [Source: docs/project-context.md#Critical Implementation Rules]
- [Source: implementation-artifacts/1-3-app-unlock-flow-auth-guard.md#Dev Notes]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Git Intelligence Summary (Previous Story)

- **Recent Activity**: Completed Story 1.3 (Unlock Flow).
- **Key Files Modified**: `src/features/auth/*`, `tests/UnlockPage.test.tsx`, `tests/useAuthStore.test.ts`.
- **Learnings**:
  - **Testing**: Strict adherence to `/tests` directory required.
  - **Strict Mode**: Watch out for double-execution of `useEffect`.
  - **Security**: TOTP secrets encrypted with PBKDF2 derived key.
