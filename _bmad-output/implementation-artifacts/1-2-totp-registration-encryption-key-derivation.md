# Story 1.2: TOTP Registration & Encryption Key Derivation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a first-time user,
I want to scan a QR code with Google Authenticator to register my TOTP secret,
so that my encryption key is derived and Ledgy is protected without a password.

## Acceptance Criteria

1. **Given** the user opens Ledgy for the first time with no existing profile
   **When** they scan the generated TOTP QR code and enter the first 6-digit code to confirm setup
   **Then** the TOTP secret is stored securely and an AES-256-GCM encryption key is derived via HKDF from the secret using WebCrypto
2. **And** the derived key is held in memory only — never written to disk in plaintext
3. **And** the `verify_totp` crypto utility validates the TOTP code correctly against RFC 6238
4. **And** zero telemetry or external pings are made during this flow

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 3): Implement TOTP Core Logic
  - [x] Subtask 1.1: Implement `src/lib/totp.ts` with `generateSecret()`, `generateOtpauthUri()`, and `verifyTotp()` using WebCrypto (HMAC-SHA1).
  - [x] Subtask 1.2: Add unit tests for `totp.ts` covering edge cases (time windows).
- [x] Task 2 (AC: 1, 2): Authentication State & Key Derivation
  - [x] Subtask 2.1: Create `src/features/auth/useAuthStore.ts` using Zustand to manage `totpSecret`, `isUnlocked`, and the volatile `encryptionKey`.
  - [x] Subtask 2.2: Integrate `deriveKeyFromTotp` from `src/lib/crypto.ts` to derive the key upon successful verification.
- [x] Task 3 (AC: 1, 4): Registration UI (First Launch)
  - [x] Subtask 3.1: Create `src/features/auth/SetupPage.tsx` with QR code display (using `qrcode.react`) and verification input.
  - [x] Subtask 3.2: Implement navigation logic in `App.tsx` or a dedicated router to redirect to `/setup` if no `totpSecret` exists.

## Dev Notes

- **HKDF**: Use `SHA-256` for HKDF as specified in `src/lib/crypto.ts`.
- **Encryption**: AES-256-GCM requires a 12-byte IV for each operation.
- **Privacy**: No external QR code generation APIs (e.g., Google Charts). Use `qrcode.react`.
- **Security**: The `encryptionKey` must NEVER be persisted to `localStorage` or PouchDB. It should reside only in the Zustand store.

### Project Structure Notes

- **Alignment**:
  - `src/features/auth/` for all authentication-related components and stores.
  - `src/lib/totp.ts` for the low-level crypto logic.
- **Detected conflicts or variances**:
  - The project already has `src/lib/crypto.ts` with `deriveKeyFromTotp`. Ensure `totp.ts` handles BASE32 decoding if the secret is stored in that format (standard for TOTP).

### References

- [Source: planning-artifacts/architecture.md#Authentication & Security]
- [Source: planning-artifacts/architecture.md#Universal Web API Layer]
- [Source: planning-artifacts/epics.md#Story 1.2: TOTP Registration & Encryption Key Derivation]
- [Source: docs/project-context.md#Authentication]

## Dev Agent Record

### Agent Model Used

Antigravity (Gemini 2.0 Flash)

### Debug Log References

### Completion Notes List

- ✅ Implemented core TOTP logic (RFC 6238) in `src/lib/totp.ts` using WebCrypto.
- ✅ Added comprehensive unit tests in `src/lib/totp.test.ts` with RFC test vectors.
- ✅ Created `useAuthStore` with Zustand for managing persisted TOTP secret and volatile `encryptionKey`.
- ✅ Implemented `SetupPage` for first-time registration with QR code generation.
- ✅ Integrated `react-router-dom` and `AuthGuard` for secure routing and redirection.
- ✅ Verified implementation via unit tests and browser simulation on port 1420.

### File List

- `src/lib/totp.ts` (NEW)
- `src/lib/totp.test.ts` (NEW)
- `src/features/auth/useAuthStore.ts` (NEW)
- `src/features/auth/SetupPage.tsx` (NEW)
- `src/features/auth/AuthGuard.tsx` (NEW)
- `src/App.tsx` (MODIFIED)
- `src/main.tsx` (MODIFIED)
- `package.json` (MODIFIED)
