# Story 1.8: Auth Guard & Session Routing

Status: ready-for-dev

<!-- Note: Validation is recommended. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **secure route protection that only allows authenticated users to access protected pages**,
so that **my sensitive data is never exposed to unauthorized users**.

## Acceptance Criteria

1. AuthGuard wraps all protected routes (Story 1-2 existing)
2. Redirects unauthenticated users to /unlock or /setup
3. Session persistence across app restarts (remember-me)
4. Session expiry enforcement (15m, 1h, 8h, 1d, 7d, 30d, never)
5. Auto-lock on tab close/inactivity (configurable)
6. TypeScript strict mode compiles without errors
7. Unit tests cover auth guard, session expiry, and redirect logic
8. Error handling dispatches to useErrorStore
9. Integration with useAuthStore for session state
10. GuestGuard prevents access to /setup and /unlock when already authenticated

## Tasks / Subtasks

- [ ] Task 1: Verify/enhance AuthGuard (AC: #1, #2, #8, #9)
  - [ ] Review existing AuthGuard from Story 1-2
  - [ ] Ensure integration with useAuthStore.isUnlocked
  - [ ] Verify redirect to /unlock for locked sessions
  - [ ] Verify redirect to /setup for unregistered users
  - [ ] Add error dispatch for auth failures
- [ ] Task 2: Implement session persistence (AC: #3, #5)
  - [ ] Verify zustand persist middleware configuration
  - [ ] Implement session expiry check on app init
  - [ ] Implement auto-lock on tab close (beforeunload event)
  - [ ] Implement inactivity timer (configurable timeout)
- [ ] Task 3: Implement session expiry (AC: #4)
  - [ ] Verify expiry options: 15m, 1h, 8h, 1d, 7d, 30d, never
  - [ ] Check expiry on every protected route access
  - [ ] Auto-logout when session expires
  - [ ] Show session expiry warning (optional UX enhancement)
- [ ] Task 4: Implement GuestGuard (AC: #10)
  - [ ] Create GuestGuard component for /setup and /unlock
  - [ ] Redirect authenticated users away from auth pages
  - [ ] Prevent double-registration scenarios
- [ ] Task 5: Write unit tests (AC: #6, #7)
  - [ ] Test AuthGuard redirects unauthenticated users
  - [ ] Test AuthGuard allows authenticated users
  - [ ] Test GuestGuard redirects authenticated users
  - [ ] Test session expiry enforcement
  - [ ] Test remember-me persistence
  - [ ] Test auto-lock on tab close
- [ ] Task 6: Verify TypeScript and integration (AC: #6, #8)
  - [ ] TypeScript strict mode: no errors
  - [ ] Error dispatch to useErrorStore
  - [ ] Integration with Story 1-7 encryption

## Dev Notes

### Critical Technical Requirements

**AuthGuard Pattern** (per Story 1-2):
```typescript
// Check useAuthStore(state => state.isUnlocked)
// Redirect to /unlock if not authenticated
// Render children if authenticated
```

**Session Expiry Options** (per useAuthStore):
```typescript
type RememberMeExpiry = '15m' | '1h' | '8h' | '1d' | '7d' | '30d' | 'never';
// Stored as Unix-ms timestamp or null for never
```

**Auto-Lock Pattern**:
```typescript
// Listen for beforeunload event
// Call useAuthStore.lock() to clear volatile state
// Persisted state remains for remember-me sessions
```

### Project Structure Notes

**Guard Organization**:
```
src/
├── features/
│   └── auth/
│       ├── AuthGuard.tsx          # Protect authenticated routes
│       ├── GuestGuard.tsx         # Protect guest-only routes
│       └── useAuthStore.ts        # Session state management
└── stores/
    └── useErrorStore.ts           # Error dispatch target
```

**Alignment with architecture.md**:
- Guards in feature folders (auth)
- Tests co-located with components
- Error handling via useErrorStore

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Naming**: `camelCase` for functions, `PascalCase` for components
- **Error Handling**: All errors dispatched to useErrorStore
- **Type Safety**: TypeScript strict mode
- **State Management**: Zustand stores only

**Integration with Previous Stories**:
- Story 1-2: AuthGuard and ErrorBoundary already exist
- Story 1-3: useAuthStore topology established
- Story 1-6: TOTP secret for authentication
- Story 1-7: Encryption key for session

### Library/Framework Requirements

**Core Dependencies** (already installed):
- `react-router-dom`: ^7.0.0 (for Navigate, useNavigate)
- `zustand`: Latest stable (persist middleware)

**DO NOT install**:
- Additional auth libraries (use existing guards)

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located: `AuthGuard.test.tsx`, `GuestGuard.test.tsx`
- Mock useAuthStore for isolated tests
- Mock react-router-dom for navigation testing
- Test session expiry with mocked time

**Critical Test Scenarios**:
1. ✅ AuthGuard redirects to /unlock when not authenticated
2. ✅ AuthGuard renders children when authenticated
3. ✅ GuestGuard redirects to /profiles when authenticated
4. ✅ GuestGuard renders children when not authenticated
5. ✅ Session expires after configured duration
6. ✅ Remember-me persists across app restarts
7. ✅ Auto-lock clears volatile state on tab close

### Git Branch Strategy

**Branch Decision**: Using `allatonce` branch for all epic implementation work.

```bash
git checkout allatonce
```

### Previous Story Intelligence

**From Story 1-2 (React Router & Error Boundaries)**:
- AuthGuard component already exists
- ErrorBoundary wraps all routes
- ErrorToast integration working

**From Story 1-3 (Zustand Store Topology)**:
- useAuthStore has isUnlocked, rememberMe, rememberMeExpiry
- initSession() called on app start
- lock() clears volatile state

**From Story 1-6 (TOTP Registration UI)**:
- TOTP secret stored in useAuthStore
- verifyAndRegister() for initial setup

**From Story 1-7 (WebCrypto AES-256 Engine)**:
- Encryption key derived from TOTP secret
- Key stored in useAuthStore (volatile)

### References

- [Source: architecture.md#Security Architecture](planning-artifacts/architecture.md)
- [Source: architecture.md#Frontend Architecture](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: epics.md#Epic 1: App Foundation & Core Security](planning-artifacts/epics.md)
- [Source: 1-2-react-router-error-boundaries.md](implementation-artifacts/1-2-react-router-error-boundaries.md)
- [Source: 1-3-zustand-store-topology.md](implementation-artifacts/1-3-zustand-store-topology.md)

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

2. **AuthGuard existing**: Review and enhance existing AuthGuard from Story 1-2.

3. **Session persistence**: Use zustand persist middleware (already configured).

4. **Session expiry**: Enforce expiry on every protected route access.

5. **Auto-lock**: Clear volatile state on tab close (beforeunload).

6. **Error handling**: ALL auth errors MUST dispatch to useErrorStore.

7. **TypeScript strict mode**: ALL code must compile without errors.

8. **Test coverage**: ALL guards MUST have unit tests.

### Next Steps

After completing this story:
1. Commit all changes to `allatonce` branch
2. Update sprint-status.yaml and COMMIT
3. Proceed to Story 1.9: Global App Settings Store
