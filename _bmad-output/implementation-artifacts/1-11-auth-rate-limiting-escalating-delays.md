# Story 1.11: Auth Rate Limiting & Escalating Delays

Status: ready-for-dev

<!-- Note: Validation is recommended. Run validate-create-story for quality check before dev-story. -->

## Story

As a **security-conscious user**,
I want **the application to implement rate limiting on authentication attempts**,
so that **brute-force attacks are prevented and my account remains secure**.

## Acceptance Criteria

1. Failed login attempts are tracked per account/IP
2. Exponential backoff implemented (1s, 2s, 4s, 8s, 16s, 30s, 60s...)
3. Maximum 5 failed attempts before lockout
4. Lockout duration: 15 minutes after max attempts
5. Rate limiting state persists across page reloads
6. User-friendly error messages showing wait time
7. TypeScript strict mode compiles without errors
8. Unit tests cover rate limiting logic and edge cases
9. Integration with useAuthStore.unlock() flow
10. Admin bypass option (for emergency access - future enhancement)

## Tasks / Subtasks

- [ ] Task 1: Create rate limiter utility (AC: #1, #2, #3, #4)
  - [ ] Create `src/lib/rateLimiter.ts` with rate limiting logic
  - [ ] Implement attempt tracking (per account identifier)
  - [ ] Implement exponential backoff calculation
  - [ ] Implement lockout after max attempts
  - [ ] Implement lockout expiry (15 minutes)
- [ ] Task 2: Add persistence layer (AC: #5)
  - [ ] Store rate limit state in localStorage
  - [ ] Hydrate rate limiter on app init
  - [ ] Clean up expired entries (auto-cleanup)
- [ ] Task 3: Integrate with auth flow (AC: #6, #9)
  - [ ] Wrap useAuthStore.unlock() with rate limiter
  - [ ] Check rate limit before attempting unlock
  - [ ] Record failed attempts
  - [ ] Reset counter on successful unlock
  - [ ] Show wait time in error messages
- [ ] Task 4: Create user feedback (AC: #6)
  - [ ] Add wait time display to UnlockPage
  - [ ] Show countdown timer during lockout
  - [ ] Disable submit button during lockout
  - [ ] Clear error message format
- [ ] Task 5: Write unit tests (AC: #7, #8)
  - [ ] Test attempt tracking
  - [ ] Test exponential backoff calculation
  - [ ] Test lockout after max attempts
  - [ ] Test lockout expiry
  - [ ] Test persistence across reloads
  - [ ] Test cleanup of expired entries
  - [ ] Test integration with auth flow
- [ ] Task 6: Verify TypeScript and security (AC: #7, #10)
  - [ ] TypeScript strict mode: no errors
  - [ ] Document admin bypass for future (Story 2.x)
  - [ ] Security review of rate limiting logic

## Dev Notes

### Critical Technical Requirements

**Exponential Backoff Formula**:
```typescript
// Delay = baseDelay * 2^(attemptNumber - 1)
// Attempts: 1=1s, 2=2s, 3=4s, 4=8s, 5=16s, 6+=30s (capped)
const baseDelay = 1000; // 1 second
const delay = Math.min(baseDelay * Math.pow(2, attempts - 1), 30000);
```

**Rate Limit State Structure**:
```typescript
interface RateLimitState {
    attempts: number;
    lastAttempt: number; // Unix timestamp
    lockedUntil: number | null; // Unix timestamp or null
}
```

**Lockout Flow**:
```
1. User enters TOTP code
2. Check rate limit → if locked, show wait time
3. If not locked, attempt unlock
4. If failed → increment attempts, check if lockout
5. If success → reset attempts
```

### Project Structure Notes

**Rate Limiter Organization**:
```
src/
├── lib/
│   └── rateLimiter.ts         # Rate limiting logic + persistence
├── features/
│   └── auth/
│       └── UnlockPage.tsx     # Display wait time, disable button
└── stores/
    └── useAuthStore.ts        # Integration with unlock()
```

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Naming**: `camelCase` for functions, `PascalCase` for interfaces
- **Error Handling**: User-friendly messages, no internal details
- **Type Safety**: TypeScript strict mode
- **Security**: No timing attacks, consistent response times

**Integration with Previous Stories**:
- Story 1-3: useAuthStore integration
- Story 1-6: TOTP verification is rate-limited
- Story 1-8: Auth guard protects against unauthorized access

### Library/Framework Requirements

**Core Dependencies** (already installed):
- No new dependencies needed
- Uses localStorage for persistence
- Native Date.now() for timing

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located: `src/lib/rateLimiter.test.ts`
- Use fake timers for time-based tests
- Mock localStorage for persistence tests
- Test edge cases (midnight UTC, DST changes)

**Critical Test Scenarios**:
1. ✅ First attempt has no delay
2. ✅ Each failed attempt increases delay exponentially
3. ✅ 5th failed attempt triggers lockout
4. ✅ Lockout lasts 15 minutes
5. ✅ Successful unlock resets counter
6. ✅ State persists across page reload
7. ✅ Expired entries are cleaned up

### Git Branch Strategy

**Branch Decision**: Using `allatonce` branch for all epic implementation work.

```bash
git checkout allatonce
```

### Previous Story Intelligence

**From Story 1-6 (TOTP Registration UI)**:
- TOTP verification in useAuthStore.unlock()
- verifyAndRegister() for initial setup

**From Story 1-8 (Auth Guard & Session Routing)**:
- unlock() flow already implemented
- Error handling via useErrorStore

**From Story 1-10 (CI/CD)**:
- Security scans in CI will check for rate limiting

### References

- [Source: OWASP Rate Limiting Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Rate_Limiting_Cheat_Sheet.html)
- [Source: NIST Authentication Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
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

2. **Exponential backoff**: MUST use formula: baseDelay * 2^(attempt-1).

3. **Max attempts**: MUST lock after 5 failed attempts.

4. **Lockout duration**: MUST be 15 minutes.

5. **Persistence**: MUST persist rate limit state in localStorage.

6. **User feedback**: MUST show remaining wait time.

7. **TypeScript strict mode**: ALL code must compile without errors.

8. **Test coverage**: ALL rate limiting functions MUST have unit tests.

### Next Steps

After completing this story:
1. Commit all changes to `allatonce` branch
2. Update sprint-status.yaml and COMMIT
3. **Complete Epic 1 Retrospective** (optional story)
4. **Begin Epic 2: Profiles & Project Management**
