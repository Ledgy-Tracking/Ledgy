# Code Review Findings

**Story:** `_bmad-output/implementation-artifacts/1-3-app-unlock-flow-auth-guard.md`
**Git vs Story Discrepancies:** 0 found (All relevant files are accounted for or existing)
**Issues Found:** 1 High, 1 Medium, 2 Low

## 🔴 CRITICAL ISSUES
- **Missing UI Tests for Passphrase Flow**: `UnlockPage.test.tsx` only tests the basic TOTP flow. The `needsPassphrase` state, which renders a completely different form (passphrase input, visibility toggle), and the `unlockWithPassphrase` interaction are **completely untested**. This is a high-risk gap for a security feature.

## 🟡 MEDIUM ISSUES
- **Confusing Passphrase Expiry UX**: The "Session expires after" option (`rememberMeExpiry`) logic for Passphrase users is confusing.
    - If "Plain Remember Me" expires -> User must enter TOTP (Security).
    - If "Passphrase Remember Me" expires -> User must enter Passphrase.
    - If "Passphrase Remember Me" is NOT expired -> User must enter Passphrase (on app restart).
    - **Impact**: The "Expiry" setting effectively does nothing for Passphrase users except allow them to *keep* entering their passphrase. It does not force a TOTP re-entry (which would be the expected "Session Expired" behavior for high security), nor does it allow them to skip the passphrase (which would be "Keep me logged in").

## 🟢 LOW ISSUES
- **Missing Reset Option for Auto-Unlocked Users**: If a user enables "Plain Remember Me", they are auto-unlocked on app launch and redirected to `/profiles`. The "Not you? Reset vault" button is located on `UnlockPage`, which is inaccessible due to the auto-redirect. Users have no in-app way to reset their vault if they want to start over.
- **Generic Error Handling**: `UnlockPage.tsx` displays `err.message` directly to the user (e.g., in `handleUnlock` and `handlePassphraseUnlock`). While WebCrypto errors are usually obscure, it is best practice to sanitize these to "Invalid Passphrase" or "System Error" to avoid leaking technical details or confusing users.
