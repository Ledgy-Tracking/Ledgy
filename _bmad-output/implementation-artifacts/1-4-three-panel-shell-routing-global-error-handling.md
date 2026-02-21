# Story 1.4: Three-Panel Shell, Routing & Global Error Handling

Status: review

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

- [x] Task 1 (AC: 3): Implement Global Error Handling
  - [x] Subtask 1.1: Create `src/stores/useErrorStore.ts` with `error` state and `dispatchError` / `clearError` actions.
  - [x] Subtask 1.2: Create `src/components/ErrorToast.tsx` using Shadcn `Toast` or custom implementation, subscribed to `useErrorStore`.
  - [x] Subtask 1.3: Add `ErrorToast` to `src/App.tsx` (global level).
  - [x] Subtask 1.4: Add tests in `tests/useErrorStore.test.ts`.
- [x] Task 2 (AC: 1, 4, 5): Implement App Shell Layout
  - [x] Subtask 2.1: Create `src/components/Layout/AppShell.tsx`.
  - [x] Subtask 2.2: Implement Left Sidebar (Collapsible, Width transition).
  - [x] Subtask 2.3: Implement Right Inspector (Collapsible, Width transition).
  - [x] Subtask 2.4: Implement Main Canvas area (Flex grow).
  - [x] Subtask 2.5: Implement Responsive Logic (Breakpoints) and Warning Banner for <900px.
  - [x] Subtask 2.6: Implement Theme Toggle (Dark/Light) and persistence in `useUIStore` or similar.
  - [x] Subtask 2.7: Add component tests in `tests/AppShell.test.tsx`.
- [x] Task 3 (AC: 2): Configure Routing
  - [x] Subtask 3.1: Update `src/App.tsx` to use React Router v7.
  - [x] Subtask 3.2: Define routes:
    - `/` -> Redirect to `/profiles` (or `/unlock` via AuthGuard)
    - `/unlock` (Public/Guard logic)
    - `/setup` (Public)
    - `/profiles` (Protected)
    - `/app/:profileId/*` (Protected, uses AppShell)
  - [x] Subtask 3.3: Ensure `AuthGuard` wraps protected routes correctly.
  - [x] Subtask 3.4: Add integration tests for routing in `tests/App.test.tsx`.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Responsive Logic Flaw: The resize listener in AppShell.tsx fires constantly beneath 1280px, aggressively forcing sidebars closed on every pixel change instead of only on boundary crossings. [src/components/Layout/AppShell.tsx:34]
- [x] [AI-Review][HIGH] Missing Profile Context: AppShell does not read the profileId from useParams to provide context to the dashboard as requested by the dev notes. [src/components/Layout/AppShell.tsx:68]
- [x] [AI-Review][MEDIUM] Redundant Warning Blast: Resizing to mobile (<900px) shows a full-screen block and simultaneously dispatches a warning to useErrorStore, creating a redundant toast. [src/components/Layout/AppShell.tsx:23]
- [x] [AI-Review][MEDIUM] Error Race Condition: ErrorToast uses a blind setTimeout(clearError, 300) during unmount which could clear a newly dispatched error. [src/components/ErrorToast.tsx:22]
- [x] [AI-Review][MEDIUM] Theme Ignoring: UnlockPage hardcodes bg-zinc-950 text-zinc-50, ignoring the new dark mode theme classes. [src/features/auth/UnlockPage.tsx:142]
- [x] [AI-Review][HIGH] Responsive Logic Gap: Auto-collapse for Inspector (1100–1279px) not implemented in resize handler [src/components/Layout/AppShell.tsx:28]
- [x] [AI-Review][HIGH] UI State Flash: Missing hydration check for persisted state causing layout shift [src/components/Layout/AppShell.tsx:17]
- [x] [AI-Review][MEDIUM] Duplicate Test Location: Tests found in src/features/auth/ instead of strictly in tests/ [src/features/auth/UnlockPage.test.tsx]
- [x] [AI-Review][MEDIUM] Error Handling Consistency: Consider wiring warning banner to useErrorStore [src/components/Layout/AppShell.tsx:44]
- [x] [AI-Review][MEDIUM] Missing Resize Test: No tests verifying transition between breakpoints [tests/AppShell.test.tsx]
- [x] [AI-Review][HIGH] AC 4 Violation (Responsive Logic): The Right Inspector cannot be toggled open when the window width is between 900-1099px. The CSS class in `AppShell.tsx` hardcodes the width to `w-0` below 1280px, overriding local state. [src/components/Layout/AppShell.tsx:135]
- [x] [AI-Review][HIGH] AC 5 Violation (Theme Isolation): The light/dark theme synchronization logic is placed directly inside `AppShell.tsx`, which means public pages like setup and unlock do not receive the theme. [src/components/Layout/AppShell.tsx:22]
- [x] [AI-Review][HIGH] AC 3 Violation (Error Handling): The story dictates "Strictly no local `useState` for async errors". However, `src/features/auth/UnlockPage.tsx` still contains and uses local `[error, setError]` state variations. [src/features/auth/UnlockPage.tsx:22]
- [x] [AI-Review][MEDIUM] Redundant Logic: In `AppShell.tsx`, the Left Sidebar contains redundant and potentially confusing conditional width logic in its CSS string evaluation. [src/components/Layout/AppShell.tsx:84]

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

Antigravity (Gemini 2.0)

### Debug Log References

- Fixed `vite.config.ts` to include `tests/` directory as per project rules.
- Resolved `MemoryRouter` context issues in `App.test.tsx`.

### Completion Notes List

- Implemented `useErrorStore` for global error/warning dispatch.
- Implemented `ErrorToast` component for global notifications.
- Created `AppShell` with a responsive three-panel layout (Sidebar, Main, Inspector).
- Configured React Router v7 with nested routes and redirects.
- Added 17 unit and integration tests (100% pass).
- ✅ Resolved review finding [HIGH]: Responsive Logic Gap. Implemented resize handler auto-collapse for Inspector and Sidebar.
- ✅ Resolved review finding [HIGH]: UI State Flash. Added mounted state to `AppShell.tsx`.
- ✅ Resolved review finding [MEDIUM]: Duplicate Test Location. Moved `src/features/auth/UnlockPage.test.tsx` to `/tests`.
- ✅ Resolved review finding [MEDIUM]: Error Handling Consistency. Dispatched `isMobile` warning via `useErrorStore`.
- ✅ Resolved review finding [MEDIUM]: Missing Resize Test. Mocked resize event in `AppShell.test.tsx` to verify auto-collapse logic.
- ✅ Resolved review finding [HIGH]: AC 4 Violation (Responsive Logic). Removed hardcoded `w-0` override for the Right Inspector.
- ✅ Resolved review finding [HIGH]: AC 5 Violation (Theme Isolation). Moved theme synchronization logic to `App.tsx`.
- ✅ Resolved review finding [HIGH]: AC 3 Violation (Error Handling). Removed local `[error, setError]` from `UnlockPage` and used `useErrorStore`.
- ✅ Resolved review finding [MEDIUM]: Redundant Logic. Simplified Left Sidebar width CSS in `AppShell.tsx`.
- ✅ Resolved review finding [HIGH]: Responsive Logic Flaw. Added prevWidthRef tracking to only toggle state on boundary crossings.
- ✅ Resolved review finding [HIGH]: Missing Profile Context. Passed profileId from useParams to Outlet context.
- ✅ Resolved review finding [MEDIUM]: Redundant Warning Blast. Removed duplicate dispatchError in AppShell resize handler.
- ✅ Resolved review finding [MEDIUM]: Error Race Condition. Updated clearError to optionally accept and check a timestamp before clearing.
- ✅ Resolved review finding [MEDIUM]: Theme Ignoring. Updated UnlockPage to use proper light/dark mode CSS classes.

### File List

- `src/stores/useErrorStore.ts`
- `src/stores/useUIStore.ts`
- `src/components/ErrorToast.tsx`
- `src/components/Layout/AppShell.tsx`
- `src/App.tsx`
- `vite.config.ts`
- `tests/useErrorStore.test.ts`
- `tests/AppShell.test.tsx`
- `tests/App.test.tsx`
- `tests/UnlockPage.test.tsx`
- `[Deleted] src/features/auth/UnlockPage.test.tsx`

## Git Intelligence Summary (Previous Story)

- **Recent Activity**: Completed Story 1.3 (Unlock Flow).
- **Key Files Modified**: `src/features/auth/*`, `tests/UnlockPage.test.tsx`, `tests/useAuthStore.test.ts`.
- **Learnings**:
  - **Testing**: Strict adherence to `/tests` directory required.
  - **Strict Mode**: Watch out for double-execution of `useEffect`.
  - **Security**: TOTP secrets encrypted with PBKDF2 derived key.
