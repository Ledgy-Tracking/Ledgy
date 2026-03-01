# Story 2.1: Profile DB Segregation Logic

Status: ready-for-dev

<!-- Note: Validation is recommended. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user managing multiple clients/projects**,
I want **each profile to have its own isolated database**,
so that **data from different clients never mixes and I can switch between profiles cleanly**.

## Acceptance Criteria

1. Each profile has a dedicated PouchDB database
2. Database naming convention: `ledgy-profile-{profileId}`
3. Profile metadata stored in separate `_profiles` database
4. Profile creation includes database initialization
5. Profile deletion includes database cleanup
6. Profile switch unloads current DB and loads target DB
7. TypeScript strict mode compiles without errors
8. Unit tests cover profile CRUD and DB segregation
9. Integration with existing PouchDB wrapper from Story 1-5
10. Profile list persisted across app restarts

## Tasks / Subtasks

- [ ] Task 1: Create profile database manager (AC: #1, #2, #3)
  - [ ] Create `src/lib/profileDbManager.ts` for multi-DB management
  - [ ] Implement database naming convention
  - [ ] Create `_profiles` metadata database
  - [ ] Implement profile metadata schema
- [ ] Task 2: Implement profile CRUD operations (AC: #4, #5)
  - [ ] Create profile (with dedicated DB)
  - [ ] Read profile list
  - [ ] Update profile metadata
  - [ ] Delete profile (with DB cleanup)
  - [ ] Validate profile name uniqueness
- [ ] Task 3: Implement profile switching (AC: #6)
  - [ ] Unload current profile database
  - [ ] Load target profile database
  - [ ] Update active profile state
  - [ ] Emit profile switch event
- [ ] Task 4: Create useProfileStore integration (AC: #7, #8)
  - [ ] Extend existing useProfileStore (Story 1-3)
  - [ ] Add profile CRUD actions
  - [ ] Add profile switching actions
  - [ ] Add loading states
  - [ ] Add error handling
- [ ] Task 5: Write unit tests (AC: #7, #8)
  - [ ] Test profile creation with DB initialization
  - [ ] Test profile list retrieval
  - [ ] Test profile update
  - [ ] Test profile deletion with DB cleanup
  - [ ] Test profile switching
  - [ ] Test database isolation
  - [ ] Test error handling
- [ ] Task 6: Verify TypeScript and integration (AC: #9, #10)
  - [ ] TypeScript strict mode: no errors
  - [ ] Integration with Story 1-5 PouchDB wrapper
  - [ ] Persistence across app restarts

## Dev Notes

### Critical Technical Requirements

**Database Naming Convention**:
```typescript
// Profile metadata database (shared)
const PROFILES_DB = '_profiles';

// Individual profile databases
const profileDbName = `ledgy-profile-${profileId}`;
// Example: ledgy-profile-a1b2c3d4
```

**Profile Metadata Schema**:
```typescript
interface ProfileMetadata {
    _id: string; // profile-{uuid}
    type: 'profile';
    name: string; // User-friendly name
    createdAt: number; // Unix timestamp
    updatedAt: number; // Unix timestamp
    color?: string; // UI color for avatar
    avatar?: string; // Initials or icon
    lastOpened?: number; // Last access timestamp
}
```

**Profile Database Manager API**:
```typescript
class ProfileDbManager {
    createProfile(name: string): Promise<ProfileMetadata>;
    getProfiles(): Promise<ProfileMetadata[]>;
    getProfile(profileId: string): Promise<ProfileMetadata | null>;
    updateProfile(profileId: string, updates: Partial<ProfileMetadata>): Promise<void>;
    deleteProfile(profileId: string): Promise<void>;
    getProfileDb(profileId: string): PouchDB.Database;
    switchProfile(profileId: string): Promise<void>;
    getCurrentProfile(): string | null;
    closeProfileDb(profileId: string): Promise<void>;
}
```

### Project Structure Notes

**Profile DB Organization**:
```
src/
├── lib/
│   ├── pouchdb.ts              # Story 1-5: Base PouchDB wrapper
│   └── profileDbManager.ts     # NEW: Multi-DB management
├── stores/
│   └── useProfileStore.ts      # Extended with CRUD actions
└── features/
    └── profile/
        ├── ProfileList.tsx     # Future: Profile selection UI
        └── ProfileSwitcher.tsx # Future: Quick switch dropdown
```

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Naming**: `camelCase` for functions, `PascalCase` for interfaces
- **Error Handling**: All errors dispatched to useErrorStore
- **Type Safety**: TypeScript strict mode
- **Store Pattern**: Zustand with isLoading and error fields

**Integration with Previous Stories**:
- Story 1-3: useProfileStore extension
- Story 1-5: PouchDB wrapper integration
- Story 1-9: App settings persist per profile

### Library/Framework Requirements

**Core Dependencies** (already installed):
- PouchDB (Story 1-5)
- Zustand (Story 1-3)
- UUID generation (use crypto.randomUUID())

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located: `src/lib/profileDbManager.test.ts`
- Mock PouchDB for isolation tests
- Test database creation/deletion
- Test profile switching

**Critical Test Scenarios**:
1. ✅ Profile creation creates dedicated database
2. ✅ Profile deletion removes database
3. ✅ Profile switching unloads/loads databases
4. ✅ Databases are isolated (no cross-contamination)
5. ✅ Profile list persists across restarts
6. ✅ Profile name uniqueness enforced
7. ✅ Error handling for DB operations

### Git Branch Strategy

**Branch Decision**: Using `allatonce` branch for all epic implementation work.

```bash
git checkout allatonce
```

### Previous Story Intelligence

**From Story 1-3 (Zustand Store Topology)**:
- useProfileStore exists with basic structure
- Extend existing store (don't create new)
- Follow store pattern: isLoading, error, actions

**From Story 1-5 (PouchDB Core Initialization)**:
- PouchDB wrapper already implemented
- Document adapter pattern
- Ghost reference pattern for deletions

**From Story 1-9 (App Settings)**:
- Settings should be per-profile
- Density and theme settings persist per profile

### References

- [Source: PouchDB Multiple Databases](https://pouchdb.com/api.html)
- [Source: architecture.md#Data Architecture](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: epics.md#Epic 2: Profiles & Project Management](planning-artifacts/epics.md)

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

2. **Database naming**: MUST use `ledgy-profile-{profileId}` convention.

3. **Metadata database**: MUST use `_profiles` for profile metadata.

4. **Profile CRUD**: MUST create, read, update, delete with DB lifecycle.

5. **Profile switching**: MUST unload current DB before loading target.

6. **TypeScript strict mode**: ALL code must compile without errors.

7. **Test coverage**: ALL profile functions MUST have unit tests.

8. **Integration**: MUST extend existing useProfileStore (Story 1-3).

### Next Steps

After completing this story:
1. Commit all changes to `allatonce` branch
2. Update sprint-status.yaml and COMMIT
3. Proceed to Story 2.2: Profile Selector Canvas
