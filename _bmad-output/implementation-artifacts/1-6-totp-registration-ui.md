# Story 1.6: TOTP Registration UI

Status: ready-for-dev

<!-- Note: Validation is recommended. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **a secure TOTP registration interface with QR code generation**,
so that **I can set up two-factor authentication using Google Authenticator or similar apps**.

## Acceptance Criteria

1. TOTP secret generation using WebCrypto or secure random library
2. QR code generation displaying TOTP URI for authenticator apps
3. Step-by-step registration wizard (3 steps: generate, scan, verify)
4. Manual entry key displayed as fallback for QR code scanning
5. TOTP code verification with real-time validation
6. Error handling with user-friendly messages via ErrorToast
7. TypeScript strict mode compiles without errors
8. Unit tests cover TOTP generation, verification, and UI flows
9. Integration with useAuthStore for registration state
10. Responsive design works on mobile and desktop

## Tasks / Subtasks

- [ ] Task 1: Create TOTP utility functions (AC: #1, #5)
  - [ ] Create `src/lib/totp.ts` with TOTP generation logic
  - [ ] Implement HMAC-SHA1 based TOTP algorithm (RFC 6238)
  - [ ] Generate secure random secrets (20 bytes, base32 encoded)
  - [ ] Implement TOTP code generation from secret
  - [ ] Implement TOTP code verification with time window tolerance (±1 step)
  - [ ] Use constant-time comparison to prevent timing attacks (HIGH - Sage)
- [ ] Task 2: Create QR code generation component (AC: #2, #4)
  - [ ] Install `qrcode.react` library
  - [ ] Create `QRCodeDisplay` component with memoized QR generation
  - [ ] Generate TOTP URI format: `otpauth://totp/...`
  - [ ] Display manual entry key below QR code
  - [ ] Add copy-to-clipboard functionality for manual key
  - [ ] Add accessible alt text for screen readers
- [ ] Task 3: Build registration wizard UI (AC: #3, #6, #9)
  - [ ] Create `TOTPRegistrationWizard` component with 3 steps
  - [ ] Step 1: Generate secret and show QR code (with "What is TOTP?" help)
  - [ ] Step 2: User enters TOTP code + countdown timer + rescan button
  - [ ] Step 3: Success confirmation + generate backup codes
  - [ ] Integrate with useAuthStore for state management (store encrypted secret)
  - [ ] Dispatch errors to useErrorStore
- [ ] Task 4: Add TOTP verification logic (AC: #5, #6)
  - [ ] Implement real-time TOTP code validation (debounced input)
  - [ ] Add 30-second time window tolerance (±1 step)
  - [ ] Show countdown timer until next code (using requestAnimationFrame)
  - [ ] Handle verification errors gracefully
- [ ] Task 5: Write unit tests (AC: #7, #8)
  - [ ] Test TOTP secret generation (20 bytes, base32)
  - [ ] Test TOTP code generation with RFC 6238 test vectors
  - [ ] Test TOTP verification with valid codes
  - [ ] Test TOTP verification with expired codes
  - [ ] Test constant-time comparison (timing attack prevention)
  - [ ] Test wizard step navigation
  - [ ] Test error handling flows
  - [ ] Test QR code URI format compliance
  - [ ] Test accessibility (ARIA labels)
- [ ] Task 6: Verify TypeScript and responsive design (AC: #7, #10)
  - [ ] TypeScript strict mode: no errors
  - [ ] Mobile responsive layout
  - [ ] Tailwind CSS utility classes only
  - [ ] Accessibility (ARIA labels, keyboard navigation)

## Dev Notes

### Critical Technical Requirements

**TOTP URI Format** (per RFC 6238):
```
otpauth://totp/Ledgy:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Ledgy&algorithm=SHA1&digits=6&period=30
```

**TOTP Algorithm** (RFC 6238):
```typescript
// 1. Get current time step (30-second windows)
const timeStep = Math.floor(Date.now() / 1000 / 30);

// 2. Convert to big-endian byte array
// 3. HMAC-SHA1 hash with secret
// 4. Dynamic truncation to 6 digits
```

**Secret Generation**:
```typescript
// 20 bytes (160 bits) of cryptographically secure random data
// Encoded as Base32 for user-friendly display
```

### Project Structure Notes

**Component Organization**:
```
src/
├── lib/
│   └── totp.ts                    # TOTP utility functions
├── features/
│   └── auth/
│       ├── TOTPRegistrationWizard.tsx
│       ├── QRCodeDisplay.tsx
│       └── TOTPVerificationInput.tsx
└── stores/
    └── useAuthStore.ts            # Integration for registration state
```

**Alignment with architecture.md**:
- Utilities in `src/lib/` (camelCase naming)
- Components in feature folders
- Tests co-located with source files
- Error handling via useErrorStore

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Naming**: `camelCase` for functions, `PascalCase` for components
- **Error Handling**: All errors dispatched to useErrorStore
- **Type Safety**: TypeScript strict mode
- **Styling**: Tailwind CSS utility classes only

**Integration with Previous Stories**:
- Story 1-2: ErrorBoundary catches any UI errors
- Story 1-3: useAuthStore integration for registration state
- Story 1-7: WebCrypto AES-256 will use TOTP secret for key derivation

### Library/Framework Requirements

**Required Dependencies**:
```json
{
  "qrcode.react": "^4.0.0",
  "thirty-two": "^1.0.2"  // Base32 encoding (or implement manually)
}
```

**DO NOT install**:
- TOTP libraries (implement RFC 6238 manually for security audit trail)
- Additional crypto libraries (use WebCrypto API)

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located: `src/lib/totp.test.ts`, `src/features/auth/TOTPRegistrationWizard.test.tsx`
- Test TOTP algorithm correctness with known test vectors
- Test QR code URI format compliance
- Test wizard step navigation and state management
- Mock useAuthStore for isolated component tests

**Critical Test Scenarios**:
1. ✅ TOTP secret is 20 bytes, base32 encoded
2. ✅ TOTP codes are 6 digits
3. ✅ TOTP verification accepts codes within ±1 time step
4. ✅ QR code URI follows otpauth:// format
5. ✅ Manual entry key matches QR code secret
6. ✅ Wizard completes registration flow successfully
7. ✅ Invalid TOTP codes show error messages
8. ✅ Errors dispatch to useErrorStore

### Git Branch Strategy

**Branch Decision**: Using `main` branch for all epic implementation work.

```bash
git checkout main
```

### Previous Story Intelligence

**From Story 1-2 (React Router & Error Boundaries)**:
- ErrorBoundary available for catching UI errors
- ErrorToast integration working

**From Story 1-3 (Zustand Store Topology)**:
- useAuthStore pattern established
- Error dispatch: useErrorStore.getState().dispatchError()

**Code Patterns to Reuse**:
- Component structure from Story 1-4 shell components
- Store integration from Story 1-3

### References

- [Source: RFC 6238 - TOTP Algorithm](https://tools.ietf.org/html/rfc6238)
- [Source: RFC 4226 - HOTP Algorithm](https://tools.ietf.org/html/rfc4226)
- [Source: Key URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
- [Source: architecture.md#Frontend Architecture](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: epics.md#Epic 1: App Foundation & Core Security](planning-artifacts/epics.md)

## Dev Agent Record

### Agent Model Used

BMad Method create-story workflow

### Debug Log References

### Completion Notes List

### File List

---

## Technical Requirements

### Mandatory Implementation Standards

1. **Use existing git branch**: You MUST work on the `main` branch.

2. **RFC 6238 compliance**: TOTP algorithm MUST follow RFC 6238 specification.

3. **Secure random generation**: Secrets MUST use crypto.getRandomValues() or equivalent.

4. **Base32 encoding**: Secrets MUST be base32 encoded for user display.

5. **Error handling**: ALL errors MUST dispatch to useErrorStore.

6. **TypeScript strict mode**: ALL code must compile without errors.

7. **Test coverage**: ALL TOTP functions MUST have unit tests.

8. **No external TOTP libs**: Implement TOTP manually for security audit trail.

### Next Steps

After completing this story:
1. Commit all changes to `main` branch
2. Update sprint-status.yaml to mark this story as "done"
3. Proceed to Story 1.7: WebCrypto AES-256 Engine
