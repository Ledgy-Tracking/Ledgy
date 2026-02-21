# Story 1.3: App Unlock Flow & Auth Guard

Status: done

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
- [x] [AI-Review][High] Broken "Reset Vault" Flow: The "Not you? Reset vault" link redirects to /setup but is blocked by GuestGuard; it needs to clear auth store first [src/features/auth/UnlockPage.tsx:126]
- [x] [AI-Review][Medium] Concurrent Submission Vulnerability: If a user pastes 6 digits and presses Enter simultaneously, both events fire in the same tick [src/features/auth/UnlockPage.tsx:46]
- [x] [AI-Review][Medium] Strict Mode Double QR Generation: TOTP secret is generated directly inside a useEffect, causing double generation in Strict Mode [src/features/auth/SetupPage.tsx:17]
- [x] [AI-Review][Medium] Missing Test Coverage: "Remember Me" checkbox was added but no tests verify its behavior [src/features/auth/UnlockPage.test.tsx:55]

### Review Follow-ups (AI) - Round 5
- [x] [AI-Review][High] initSession() expiry branch doesn't set needsPassphrase — passphrase-protected users who hit expiry see the TOTP input instead of the passphrase prompt, and unlock() silently returns false because totpSecret is null, leaving the user stuck with "Invalid code" indefinitely [src/features/auth/useAuthStore.ts:91]
- [x] [AI-Review][High] No test coverage for expiry-on-passphrase-session: initSession expiry suite only tests plain remember-me (totpSecret set); add a test where rememberMeExpiry is past AND encryptedTotpSecret is set with totpSecret null — asserting needsPassphrase becomes true [src/features/auth/useAuthStore.test.ts]
- [x] [AI-Review][Medium] unlockWithPassphrase does not restore rememberMeExpiry — after session expiry clears it to null, the next passphrase unlock writes no new expiry, so subsequent sessions are eternal regardless of the user's original expiry preference [src/features/auth/useAuthStore.ts:182]
- [x] [AI-Review][Medium] App.test.tsx mock omits encryptedTotpSecret from state — all three guards select this field; the missing key returns undefined, making the test silently exercise unrealistic state and masking potential guard regressions [src/App.test.tsx:13]
- [x] [AI-Review][Medium] initSession() called as fire-and-forget at module scope — the returned Promise<void> is discarded; unhandled rejections are silently swallowed and the app renders before initSession completes, causing a flash of the TOTP screen for passphrase users on cold start [src/features/auth/useAuthStore.ts:268]
- [x] [AI-Review][Low] passphrase || undefined uses falsy coercion — replace with passphrase.length > 0 ? passphrase : undefined to avoid mishandling edge-case strings [src/features/auth/UnlockPage.tsx:45]
- [x] [AI-Review][Low] unlock() silent false return when totpSecret is null gives no diagnostic signal — add console.warn to make the passphrase-session state mismatch diagnosable [src/features/auth/useAuthStore.ts:118]

### Review Follow-ups (AI) - Round 6
- [x] [AI-Review][High] Missing Integration Tests for Routing/Guards in App.test.tsx [src/App.test.tsx]
- [x] [AI-Review][Medium] DRY Violation in Guards (isRegistered logic) [src/features/auth/AuthGuard.tsx]
- [x] [AI-Review][Low] Potential Sensitive Error Logging in UnlockPage.tsx [src/features/auth/UnlockPage.tsx]
- [x] [AI-Review][Low] Hardcoded Default Expiry in UnlockPage.tsx [src/features/auth/UnlockPage.tsx]

### Review Follow-ups (AI) - Round 4
- [x] [AI-Review][High] Security Warning: "Remember Me" stored secret in plaintext localStorage with no additional protection — added inline security notice UI to UnlockPage warning users of the risk [src/features/auth/UnlockPage.tsx]
- [x] [AI-Review][High] Remember Me Passphrase: Add optional passphrase field (shown when Remember Me is checked) that derives a key via PBKDF2 to encrypt the stored totpSecret at rest; on initSession with a passphrase-protected secret, prompt for passphrase instead of auto-unlocking [src/features/auth/UnlockPage.tsx, src/features/auth/useAuthStore.ts, src/lib/crypto.ts]
- [x] [AI-Review][High] Remember Me Session Expiry: Add expiry selector (shown when Remember Me is checked) with options: 15 min, 1 h, 8 h, 1 day, 7 days, 30 days, never; store rememberMeExpiry timestamp in persisted state; check expiry in initSession and lock/redirect to /unlock if expired [src/features/auth/useAuthStore.ts, src/features/auth/UnlockPage.tsx]
- [x] [AI-Review][Medium] SetupPage concurrent submission uses isSubmitting state instead of a ref — fix mirrors the UnlockPage pattern (add isSubmittingRef) [src/features/auth/SetupPage.tsx:32]
- [x] [AI-Review][Medium] UnlockPage.test.tsx mock omits reset(), so the "Not you? Reset vault" button would throw in tests — add reset: vi.fn() to mock state and add a test for the reset flow [src/features/auth/UnlockPage.test.tsx:36]
- [x] [AI-Review][Medium] src/App.test.tsx and src/features/dashboard/Dashboard.tsx are changed in this branch but missing from the Dev Agent Record File List [1-3-app-unlock-flow-auth-guard.md]
- [x] [AI-Review][Low] HKDF salt 'ledgy-salt-v1' hardcoded in 3 places — extract to a named constant in src/lib/crypto.ts [src/features/auth/useAuthStore.ts]
- [x] [AI-Review][Low] lock() clears rememberMe preference — should only clear isUnlocked and encryptionKey; user preference should persist until explicitly unchecked [src/features/auth/useAuthStore.ts:90]
- [x] [AI-Review][Low] SetupPage navigates to '/' after registration instead of '/profiles', inconsistent with the post-auth destination set by this story [src/features/auth/SetupPage.tsx:42]
- [x] [AI-Review][Low] isRegistered() method in useAuthStore is dead code — all guards derive registration state directly from totpSecret; remove to reduce interface noise [src/features/auth/useAuthStore.ts:86]

### Review Follow-ups (AI) - Round 7
- [x] [AI-Review][High] Missing UI Tests for Passphrase Flow: UnlockPage.test.tsx lacks coverage for needsPassphrase state, input handling, visibility toggle, and unlockWithPassphrase call. [src/features/auth/UnlockPage.test.tsx]
- [x] [AI-Review][Medium] Confusing Passphrase Expiry UX: "Session expires after" option resets timer but doesn't force TOTP re-entry, making it redundant for passphrase users. [src/features/auth/useAuthStore.ts]
- [x] [AI-Review][Low] Missing Reset Option for Auto-Unlocked Users: "Not you? Reset vault" button inaccessible on UnlockPage due to auto-redirect. [src/features/auth/UnlockPage.tsx]
- [x] [AI-Review][Low] Generic Error Handling: UnlockPage.tsx displays raw err.message; sanitize to generic user-friendly messages. [src/features/auth/UnlockPage.tsx]

### Review Follow-ups (AI) - Round 8
- [x] [AI-Review][High] Test Location Violation: Moved all test files to `/tests` directory to comply with project-context.md rules. [tests/UnlockPage.test.tsx, tests/useAuthStore.test.ts, tests/App.test.tsx]
- [x] [AI-Review][Medium] Insecure Initial Setup: Updated `SetupPage` to include Passphrase and Remember Me options during registration to prevent forced plaintext storage. [src/features/auth/SetupPage.tsx]
- [x] [AI-Review][Low] Misleading Security UI: Added permanent "Vault Unsecured" warning in `UnlockPage` and `SetupPage` when passphrase is not set. [src/features/auth/UnlockPage.tsx]

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
- ✅ Resolved review finding [High]: Missing Integration Tests for Routing/Guards in App.test.tsx - Added `setupAuthState` helper and comprehensive tests for unregistered, locked, and unlocked states.
- ✅ Resolved review finding [Medium]: DRY Violation in Guards - Exported `useIsRegistered` from `useAuthStore` and updated `AuthGuard`, `GuestGuard`, `UnlockGuard`.
- ✅ Resolved review finding [Low]: Potential Sensitive Error Logging - Removed error object from `console.error` in `UnlockPage.tsx`.
- ✅ Resolved review finding [Low]: Hardcoded Default Expiry - Defined `DEFAULT_EXPIRY` in `useAuthStore` and used it in `UnlockPage.tsx`.
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
- ✅ Resolved review finding [High]: Broken "Reset Vault" Flow.
- ✅ Resolved review finding [Medium]: Concurrent Submission Vulnerability.
- ✅ Resolved review finding [Medium]: Strict Mode Double QR Generation.
- ✅ Resolved review finding [Medium]: Missing Test Coverage for "Remember Me".
- ✅ Resolved review finding [High] Round 5: initSession() expiry branch now sets needsPassphrase: true when encryptedTotpSecret is present, routing passphrase users to the passphrase prompt instead of the broken TOTP screen.
- ✅ Resolved review finding [High] Round 5: Added test coverage for expiry-on-passphrase-session — verifies needsPassphrase becomes true and session is cleared.
- ✅ Resolved review finding [Medium] Round 5: Added rememberMeExpiryMs persisted field; unlockWithPassphrase now computes a fresh rememberMeExpiry from it, preventing eternal sessions after expiry.
- ✅ Resolved review finding [Medium] Round 5: App.test.tsx mock now includes encryptedTotpSecret: null so all guards exercise realistic state.
- ✅ Resolved review finding [Medium] Round 5: Moved initSession() call to main.tsx and await it (.finally render) so the app never renders with stale auth state, eliminating TOTP-screen flash.
- ✅ Resolved review finding [Low] Round 5: Replaced passphrase || undefined with passphrase.length > 0 ? passphrase : undefined in UnlockPage.
- ✅ Resolved review finding [Low] Round 5: Added console.warn in unlock() when totpSecret is null to surface passphrase-session mismatches.
- ✅ Resolved review finding [High] Round 7: Missing UI Tests for Passphrase Flow - Added extensive tests in UnlockPage.test.tsx covering needsPassphrase, unlockWithPassphrase, and error handling.
- ✅ Resolved review finding [Medium] Round 7: Confusing Passphrase Expiry UX - Implemented strict logout behavior in useAuthStore.ts (clears all state on expiry) to make "Session expires after" meaningful. Updated useAuthStore.test.ts to verify.
- ✅ Resolved review finding [Low] Round 7: Missing Reset Option for Auto-Unlocked Users - Modified UnlockGuard.tsx to allow ?reset=true bypass; updated UnlockPage.tsx to show "Vault Unlocked" UI with Reset button if unlocked.
- ✅ Resolved review finding [Low] Round 7: Generic Error Handling - Added friendlyError helper in UnlockPage.tsx to map error codes to user-friendly messages.

### File List
- `src/features/auth/UnlockPage.tsx`
- `tests/UnlockPage.test.tsx`
- `src/features/auth/AuthGuard.tsx`
- `src/features/auth/GuestGuard.tsx`
- `src/features/auth/UnlockGuard.tsx`
- `src/features/auth/SetupPage.tsx`
- `src/features/auth/useAuthStore.ts`
- `tests/useAuthStore.test.ts`
- `src/App.tsx`
- `tests/App.test.tsx`
- `src/main.tsx`
- `src/features/dashboard/Dashboard.tsx`
- `src/lib/crypto.ts`

### Change Log
- Addressed code review findings - 6 items resolved
- Addressed Review Round 2 findings - 9 items resolved, including SetupPage vulnerabilities, Remember Me session persistence, and GuestGuard visual flash preventions.
- Addressed Review Round 3 findings - 4 items resolved, including Reset Vault flow fixes, strict mode double generation, and testing coverage.
- Round 5 code review (2026-02-21): 7 action items added — 2 High (initSession expiry/passphrase lockout + missing test coverage), 3 Medium (unlockWithPassphrase expiry restoration, App.test.tsx mock gap, fire-and-forget initSession), 2 Low (passphrase falsy coercion, silent false return diagnostics).
- Round 4 code review: added Remember Me security warning UI to UnlockPage; fixed File List to include App.test.tsx.
- Addressed Review Round 4 findings - 9 items resolved: PBKDF2 passphrase encryption for stored secret, session expiry selector, SetupPage isSubmittingRef, UnlockPage reset flow test, HKDF_SALT constant, lock() preserves rememberMe, SetupPage /profiles nav, removed dead isRegistered(), guards check encryptedTotpSecret.
- Round 4 review follow-ups resolved (2026-02-21): implemented Remember Me passphrase (PBKDF2 encryption of stored TOTP secret, needsPassphrase UI in UnlockPage, unlockWithPassphrase action); implemented session expiry selector (EXPIRY_OPTIONS, rememberMeExpiry timestamp, initSession expiry check); fixed SetupPage isSubmittingRef; added reset() mock + reset-flow test; extracted HKDF_SALT constant to crypto.ts; fixed lock() to preserve rememberMe; fixed SetupPage to navigate to /profiles; removed dead isRegistered() method; updated guards to check encryptedTotpSecret; added useAuthStore.test.ts.
- Round 5 review follow-ups resolved (2026-02-21): fixed initSession() expiry branch to set needsPassphrase for passphrase sessions; added rememberMeExpiryMs persisted field; fixed unlockWithPassphrase to restore fresh rememberMeExpiry; added encryptedTotpSecret to App.test.tsx mock; moved initSession() to main.tsx awaited before render; replaced passphrase || undefined with passphrase.length > 0 check; added console.warn for null-totpSecret in unlock(); 3 new tests added covering all new behaviours.
- Round 6 code review (2026-02-21): 4 action items added — 1 High (missing App.test.tsx routing tests), 1 Medium (DRY guards), 2 Low.
- Round 6 review follow-ups resolved (2026-02-21): Added integration tests for App routing; Refactored `isRegistered` logic to `useIsRegistered` hook; Sanitized error logging in UnlockPage; Centralized `DEFAULT_EXPIRY` constant.
- Round 7 review follow-ups resolved (2026-02-21): Implemented strict session expiry (logout on expiry); Added reset bypass for unlocked users (?reset=true); Improved error handling in UnlockPage; Added comprehensive UI tests in UnlockPage.test.tsx.
- Round 8 review follow-ups resolved (2026-02-21): Moved all tests to `/tests` directory; Secured `SetupPage` with passphrase options; Added permanent security warnings for unencrypted vaults.
