# Story 1.3: App Unlock Flow & Auth Guard

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a returning user,
I want to enter my TOTP code on the unlock screen,
so that my data is decrypted and I can access my profiles.

## Acceptance Criteria

1. **Given** Ledgy is launched with an existing TOTP registration
   **When** the user enters a valid 6-digit TOTP code on the `/unlock` route
   **Then** `useAuthStore().isUnlocked` is set to `true` and the user is redirected to the profile selector (`/profiles`)
2. **And** all routes except `/setup` and `/unlock` are wrapped in `<AuthGuard />` and redirect unauthenticated users to `/unlock`
3. **And** an invalid TOTP code displays an inline error message below the input field — no toast, no modal
4. **And** the unlock screen does not expose any profile data before successful TOTP verification
5. **And** the UI follows the Emerald/Zinc dark theme specified in the UX Design Specification

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 3, 5): Implement Unlock UI
  - [x] Subtask 1.1: Create `src/features/auth/UnlockPage.tsx` with a focusable 6-digit OTP input.
  - [x] Subtask 1.2: Implement form handling to call `useAuthStore().unlock(code)` on submission or when 6 digits are entered.
  - [x] Subtask 1.3: Add inline error state when `unlock` returns `false`.
- [x] Task 2 (AC: 2): Refine Routing & Protection
  - [x] Subtask 2.1: Update `src/features/auth/AuthGuard.tsx` with corrected redirection logic (Backlog -> /setup, Registered & Locked -> /unlock).
  - [x] Subtask 2.2: Register `UnlockPage` in `src/App.tsx` and ensure `/profiles` route is planned for Epic 2.
- [x] Task 3 (AC: 4): Security Validation
  - [x] Subtask 3.1: Verify that accessing `/` or other protected routes while locked forces a redirect to `/unlock`.

### Review Follow-ups (AI)
- [x] [AI-Review][High] Dev Agent Record -> File List is empty. Needs documentation of created/modified files (UnlockPage.tsx, AuthGuard.tsx, App.tsx, UnlockPage.test.tsx). [1-3-app-unlock-flow-auth-guard.md:67]
- [x] [AI-Review][Medium] UnlockPage input is not wrapped in a form, preventing native Enter-key submission. [src/features/auth/UnlockPage.tsx:55]
- [x] [AI-Review][Medium] Focus is not returned to the first input slot automatically after an invalid code attempt. [src/features/auth/UnlockPage.tsx:21]
- [x] [AI-Review][Low] `Dashboard` placeholder component is declared directly in `App.tsx` instead of its own file. [src/App.tsx:48]
- [x] [AI-Review][High] `AuthGuard` retrieves `isRegistered` as a getter function from Zustand (`const { isRegistered } = useAuthStore()`) instead of a reactive selector, breaking React reactivity. [src/features/auth/AuthGuard.tsx:10]
- [x] [AI-Review][High] `AuthGuard` allows fully authenticated users to access `/setup` and `/unlock` routes instead of redirecting them. [src/features/auth/AuthGuard.tsx:13]
- [x] [AI-Review][Medium] AC 2 specifically stated to NOT wrap `/setup` and `/unlock` in `AuthGuard`, but `App.tsx` wraps ALL routes in `AuthGuard`. [src/App.tsx:9]
- [x] [AI-Review][Medium] `UnlockPage` can trigger `handleUnlock` multiple times concurrently; `onChange` lacks an `isSubmitting` check before calling `handleUnlock`. [src/features/auth/UnlockPage.tsx:38]
- [x] [AI-Review][Medium] `UnlockPage.test.tsx` naively mocks `<OTPInput>`, bypassing testing of the actual input interaction. [src/features/auth/UnlockPage.test.tsx:26]
- [x] [AI-Review][Low] `App.tsx` does not define a fallback catch-all route (e.g., `path="*"`). [src/App.tsx:45]

### Review Follow-ups (AI) - Round 2
- [x] [AI-Review][High] OTPInput lacks disabled state while isSubmitting is true [src/features/auth/UnlockPage.tsx:78]
- [x] [AI-Review][Medium] SetupPage.tsx modified but undocumented in File List [src/features/auth/SetupPage.tsx]
- [x] [AI-Review][Medium] Concurrent Submission Vulnerability in SetupPage [src/features/auth/SetupPage.tsx:82]
- [x] [AI-Review][Medium] Visual Flash on Redirects due to component-level useEffects (needs GuestGuard) [src/features/auth/SetupPage.tsx:17]
- [x] [AI-Review][Low] Hacky Focus Recovery using setTimeout instead of reactive effect [src/features/auth/UnlockPage.tsx:38]
- [x] [AI-Review][Low] Obscured Error Context in handleUnlock catch block [src/features/auth/UnlockPage.tsx:41]
- [x] [Feature] Provide an option to create a new profile on the unlock screen [src/features/auth/UnlockPage.tsx]
- [x] [Feature] Auto-focus the OTP input on page load [src/features/auth/UnlockPage.tsx]
- [x] [Feature] Implement session persistence / "Remember Me" so OTP isn't required on every app load [src/features/auth/useAuthStore.ts]

### Review Follow-ups (AI) - Round 3
- [ ] [AI-Review][High] Broken "Reset Vault" Flow: The "Not you? Reset vault" link redirects to /setup but is blocked by GuestGuard; it needs to clear auth store first [src/features/auth/UnlockPage.tsx:126]
- [ ] [AI-Review][Medium] Concurrent Submission Vulnerability: If a user pastes 6 digits and presses Enter simultaneously, both events fire in the same tick [src/features/auth/UnlockPage.tsx:46]
- [ ] [AI-Review][Medium] Strict Mode Double QR Generation: TOTP secret is generated directly inside a useEffect, causing double generation in Strict Mode [src/features/auth/SetupPage.tsx:17]
- [ ] [AI-Review][Medium] Missing Test Coverage: "Remember Me" checkbox was added but no tests verify its behavior [src/features/auth/UnlockPage.test.tsx:55]

## Dev Notes

- **Input OTP**: Recommend using `input-otp` or a similar highly accessible component to match the "Builder's Pride" aesthetic.
- **Navigation**: Use `react-router-dom`'s `useNavigate` for post-unlock redirection.
- **State Management**: The `useAuthStore` already contains the `unlock` method which handles HKDF key derivation.
- **Styling**: Ensure full coverage of the `zinc-950` background and `emerald-500` accents.

### Project Structure Notes

- **Alignment**:
  - `src/features/auth/` remains the home for all authentication logic.
- **Detected conflicts or variances**:
  - Ensure `AuthGuard` doesn't create a redirect loop between `/setup` and `/unlock`.
  - The `Dashboard` in `App.tsx` is currently a placeholder; ensures it's protected.

### References

- [Source: planning-artifacts/architecture.md#Authentication & Security](file:///c:/Users/njtan/Documents/GitHub/ledgy/_bmad-output/planning-artifacts/architecture.md#L119-128)
- [Source: planning-artifacts/ux-design-specification.md#Journey 1 — Alex: Daily Entry Loop](file:///c:/Users/njtan/Documents/GitHub/ledgy/_bmad-output/planning-artifacts/ux-design-specification.md#L379-403)
- [Source: planning-artifacts/epics.md#Story 1.3: App Unlock Flow & Auth Guard](file:///c:/Users/njtan/Documents/GitHub/ledgy/_bmad-output/planning-artifacts/epics.md#L181-195)
- [Source: docs/project-context.md#Critical Implementation Rules](file:///c:/Users/njtan/Documents/GitHub/ledgy/_bmad-output/project-context.md#L29-51)

## Dev Agent Record

### Agent Model Used

Antigravity (Gemini 2.0 Flash)

### Debug Log References
- Fixed form wrapping and focus issues in `UnlockPage`
- Abstracted `Dashboard` to `src/features/dashboard/Dashboard.tsx`

### Completion Notes List
- ✅ Resolved review finding [High]: Dev Agent Record -> File List is empty.
- ✅ Resolved review finding [Medium]: UnlockPage input is not wrapped in a form.
- ✅ Resolved review finding [Medium]: Focus is not returned to the first input slot automatically.
- ✅ Resolved review finding [Low]: `Dashboard` placeholder component is declared directly in `App.tsx`.
- ✅ Resolved review finding [High]: `AuthGuard` retrieves `isRegistered` as a getter function
- ✅ Resolved review finding [High]: `AuthGuard` allows fully authenticated users to access `/setup` and `/unlock` routes
- ✅ Resolved review finding [Medium]: AC 2 specifically stated to NOT wrap `/setup` and `/unlock` in `AuthGuard`
- ✅ Resolved review finding [Medium]: `UnlockPage` can trigger `handleUnlock` multiple times concurrently
- ✅ Resolved review finding [Medium]: `UnlockPage.test.tsx` naively mocks `<OTPInput>`
- ✅ Resolved review finding [Low]: `App.tsx` does not define a fallback catch-all route

### File List
- `src/features/auth/UnlockPage.tsx`
- `src/features/auth/UnlockPage.test.tsx`
- `src/features/auth/AuthGuard.tsx`
- `src/features/auth/GuestGuard.tsx`
- `src/features/auth/UnlockGuard.tsx`
- `src/features/auth/SetupPage.tsx`
- `src/features/auth/useAuthStore.ts`
- `src/App.tsx`
- `src/features/dashboard/Dashboard.tsx`

### Change Log
- Addressed code review findings - 6 items resolved
- Addressed Review Round 2 findings - 9 items resolved, including SetupPage vulnerabilities, Remember Me session persistence, and GuestGuard visual flash preventions.
