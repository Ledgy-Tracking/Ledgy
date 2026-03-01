# Story 1.7: WebCrypto AES-256 Engine

Status: ready-for-dev

<!-- Note: Validation is recommended. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **secure AES-256 encryption for my data using WebCrypto API**,
so that **my sensitive information is protected with industry-standard encryption**.

## Acceptance Criteria

1. AES-GCM 256-bit key generation using WebCrypto API
2. HKDF key derivation from TOTP secret (Story 1-6)
3. Encrypt/decrypt functions with proper IV/nonce handling
4. PBKDF2 key derivation from passphrase (for remember-me feature)
5. TypeScript strict mode compiles without errors
6. Unit tests cover encryption, decryption, and key derivation
7. Integration with useAuthStore for vault encryption
8. Error handling dispatches to useErrorStore
9. No external crypto libraries (WebCrypto API only)
10. Proper key storage (never store raw keys in memory longer than needed)

## Tasks / Subtasks

- [ ] Task 1: Implement AES-GCM encryption (AC: #1, #3, #9)
  - [ ] Create `src/lib/crypto.ts` with WebCrypto wrappers
  - [ ] Implement `generateAESKey()` - 256-bit key generation
  - [ ] Implement `encryptPayload(key, data)` - AES-GCM encryption
  - [ ] Implement `decryptPayload(key, iv, ciphertext)` - AES-GCM decryption
  - [ ] Handle IV/nonce generation (12 bytes for GCM)
  - [ ] Export/import key in JWK format for storage
- [ ] Task 2: Implement HKDF key derivation (AC: #2, #7)
  - [ ] Implement `deriveKeyFromTotp(totpSecret, salt)` - HKDF-SHA256
  - [ ] Use fixed HKDF salt from architecture.md
  - [ ] Derive 256-bit AES key from TOTP secret
  - [ ] Integrate with useAuthStore.unlock()
- [ ] Task 3: Implement PBKDF2 key derivation (AC: #4, #8)
  - [ ] Implement `deriveKeyFromPassphrase(passphrase, salt)` - PBKDF2-SHA256
  - [ ] Use 100,000 iterations minimum (OWASP recommendation)
  - [ ] Generate random 16-byte salt per derivation
  - [ ] Integrate with remember-me + passphrase feature
  - [ ] Add loading indicator for PBKDF2 operations (HIGH - Amelia/Flash)
- [ ] Task 4: Add error handling integration (AC: #8)
  - [ ] Wrap all crypto operations in try/catch
  - [ ] Dispatch errors to useErrorStore
  - [ ] User-friendly error messages for crypto failures
  - [ ] NEVER log keys or ciphertexts (HIGH - Sage)
- [ ] Task 5: Write unit tests (AC: #5, #6)
  - [ ] Test AES key generation (256-bit)
  - [ ] Test encrypt/decrypt round-trip
  - [ ] Test HKDF key derivation from TOTP secret
  - [ ] Test PBKDF2 key derivation from passphrase
  - [ ] Test IV uniqueness (statistical randomness test)
  - [ ] Test GCM auth tag (tampering detection)
  - [ ] Test decrypt fails with wrong key
  - [ ] Test error handling flows
  - [ ] Add RFC 5869 HKDF test vectors (LOW - Murat)
- [ ] Task 6: Verify TypeScript and security (AC: #5, #10)
  - [ ] TypeScript strict mode: no errors
  - [ ] Keys cleared from memory after use
  - [ ] No hardcoded keys or salts (except HKDF salt)
  - [ ] All crypto operations use WebCrypto API

## Dev Notes

### Critical Technical Requirements

**HKDF Salt** (per architecture.md):
```typescript
// Fixed salt for HKDF key derivation from TOTP secret
// This is a protocol constant, not a secret
export const HKDF_SALT = 'Ledgy-HKDF-Salt-v1';
```

**PBKDF2 Parameters** (OWASP 2023):
```typescript
// Minimum 100,000 iterations for PBKDF2-SHA256
// Salt: 16 bytes random per derivation
// Output: 256-bit key for AES-GCM
```

**AES-GCM Parameters**:
```typescript
// Key size: 256 bits
// IV/Nonce: 12 bytes (96 bits) - NIST recommendation
// Tag length: 128 bits (default)
// Mode: GCM (authenticated encryption)
```

### Project Structure Notes

**Crypto Module Organization**:
```
src/
├── lib/
│   └── crypto.ts                # WebCrypto AES-256 engine
├── features/
│   └── auth/
│       └── useAuthStore.ts      # Integration for vault encryption
└── stores/
    └── useErrorStore.ts         # Error dispatch target
```

**Alignment with architecture.md**:
- Utilities in `src/lib/` (camelCase naming)
- Tests co-located: `crypto.test.ts` next to `crypto.ts`
- No external crypto libraries

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Naming**: `camelCase` for functions, `PascalCase` for interfaces
- **Error Handling**: All errors dispatched to useErrorStore
- **Type Safety**: TypeScript strict mode
- **Security**: WebCrypto API only, no external libs

**Integration with Previous Stories**:
- Story 1-3: useAuthStore integration for encryption key
- Story 1-6: TOTP secret used as HKDF input
- Story 1-8: Auth guard uses encryption key for session

### Library/Framework Requirements

**Core Dependencies** (already available):
- WebCrypto API (built into browsers)
- No external crypto libraries needed

**DO NOT install**:
- crypto-js, bcrypt, or other crypto libraries
- WebCrypto provides all needed functionality

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located: `src/lib/crypto.test.ts`
- Test encrypt/decrypt round-trip with known plaintext
- Test key derivation with known test vectors
- Test IV uniqueness across multiple encryptions
- Mock useErrorStore for error dispatch verification

**Critical Test Scenarios**:
1. ✅ AES key is 256 bits
2. ✅ Encrypt/decrypt produces original plaintext
3. ✅ Different IVs generated for each encryption
4. ✅ HKDF derives same key from same TOTP secret
5. ✅ PBKDF2 derives same key from same passphrase+salt
6. ✅ Errors dispatch to useErrorStore

### Git Branch Strategy

**Branch Decision**: Using `allatonce` branch for all epic implementation work.

```bash
git checkout allatonce
```

### Previous Story Intelligence

**From Story 1-6 (TOTP Registration UI)**:
- TOTP secret available in useAuthStore
- `decodeSecret()` converts base32 to bytes
- TOTP secret used as HKDF input for vault key

**From Story 1-3 (Zustand Store Topology)**:
- useAuthStore has `encryptionKey: CryptoKey | null`
- Error dispatch: `useErrorStore.getState().dispatchError()`

**Code Patterns to Reuse**:
- Error handling from Story 1-6 totp.ts
- Store integration from Story 1-3

### References

- [Source: WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Source: NIST SP 800-38D (GCM Mode)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [Source: OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Source: RFC 5869 (HKDF)](https://tools.ietf.org/html/rfc5869)
- [Source: architecture.md#Security Architecture](planning-artifacts/architecture.md)
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

1. **Use existing git branch**: You MUST work on the `allatonce` branch.

2. **WebCrypto API only**: NO external crypto libraries allowed.

3. **AES-GCM 256-bit**: Key size MUST be 256 bits, mode MUST be GCM.

4. **HKDF-SHA256**: Key derivation from TOTP secret MUST use HKDF-SHA256.

5. **PBKDF2-SHA256**: Passphrase derivation MUST use PBKDF2-SHA256 with 100,000+ iterations.

6. **Unique IV**: NEVER reuse IV with same key (generate random 12-byte IV per encryption).

7. **Error handling**: ALL crypto errors MUST dispatch to useErrorStore.

8. **TypeScript strict mode**: ALL code must compile without errors.

### Next Steps

After completing this story:
1. Commit all changes to `allatonce` branch
2. Update sprint-status.yaml and COMMIT
3. Proceed to Story 1.8: Auth Guard & Session Routing
