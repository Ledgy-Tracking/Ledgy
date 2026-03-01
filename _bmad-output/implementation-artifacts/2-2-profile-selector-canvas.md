# Story 2.2: Profile Selector Canvas

Status: review

<!-- Note: Validation is recommended. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user with multiple profiles**,
I want **a visual canvas showing all my profiles as cards**,
so that **I can easily see and select which profile to work with**.

## Acceptance Criteria

1. Profile selector canvas displays all profiles as cards
2. Each card shows profile name, color/avatar, and last opened date (relative time)
3. Clicking a card switches to that profile and navigates to home dashboard
4. Empty state shown when no profiles exist (links to create profile)
5. Active profile is visually highlighted
6. Loading state during profile fetch
7. Error state with retry option if fetch fails
8. TypeScript strict mode compiles without errors
9. Unit tests cover component rendering and interactions
10. Integration with useProfileStore for state management
11. Accessibility: Keyboard navigation (Tab, Enter/Space), focus states, ARIA labels, WCAG 2.1 AA contrast
12. Density responsive: Grid gap and card spacing adjust based on density setting (Story 1-9)

## Tasks / Subtasks

- [x] Task 1: Create ProfileCard component (AC: #1, #2)
  - [x] Create `src/features/profile/ProfileCard.tsx`
  - [x] Display profile name from metadata
  - [x] Show color/avatar visual indicator
  - [x] Display last opened date (relative time using Intl.RelativeTimeFormat)
  - [x] Add hover and focus states (WCAG 2.1 AA)
  - [x] Add active state styling
  - [x] Implement keyboard interaction (Enter/Space to select)
- [x] Task 2: Create ProfileSelectorCanvas component (AC: #1, #3, #4, #5)
  - [x] Create `src/features/profile/ProfileSelectorCanvas.tsx`
  - [x] Grid layout for profile cards (responsive: auto-fill, minmax(280px, 1fr))
  - [x] Fetch profiles on mount using useProfileStore
  - [x] Handle empty state (no profiles) - link to create profile
  - [x] Highlight active profile card
  - [x] Navigate to home dashboard on card click after setActiveProfile()
  - [x] Subscribe to `ledgy:profile:switch` event and refresh profile list
  - [x] Apply density-based spacing (Story 1-9)
- [x] Task 3: Implement loading and error states (AC: #6, #7)
  - [x] Add loading skeleton during fetch (create reusable LoadingSkeleton if needed)
  - [x] Display error message on failure
  - [x] Add retry button for failed fetches
  - [x] Wrap with ErrorBoundary (Story 1-2 pattern) - NOTE: ErrorBoundary wraps at route level
  - [x] Integrate with useErrorStore
- [x] Task 4: Create reusable UI components (if not existing)
  - [x] Check `src/components/ui/` for EmptyState component
  - [x] Check `src/components/ui/` for LoadingSkeleton component
  - [x] Create EmptyState.tsx if missing (reusable across features)
  - [x] Create LoadingSkeleton.tsx if missing (reusable across features)
- [x] Task 5: Write unit tests (AC: #8, #9, #11)
  - [x] Test ProfileCard rendering with props
  - [x] Test ProfileCard keyboard interaction (Tab, Enter, Space)
  - [x] Test empty state display
  - [x] Test loading state
  - [x] Test error state with retry
  - [x] Test card click navigation and setActiveProfile call
  - [x] Test active profile highlighting
  - [x] Test accessibility (focus states, ARIA labels)
  - [x] Test profile switch event subscription
- [x] Task 6: Verify TypeScript and integration (AC: #8, #10, #12)
  - [x] TypeScript strict mode: no errors
  - [x] Integration with useProfileStore
  - [x] Density setting integration (Story 1-9)
  - [x] Error boundary integration (Story 1-2)
  - [x] Responsive design verification (mobile/desktop)

## Dev Notes

### Critical Technical Requirements

**Component Structure**:
```typescript
// ProfileCard.tsx
interface ProfileCardProps {
    profile: ProfileMetadata;
    isActive: boolean;
    onClick: () => void;
}

// ProfileSelectorCanvas.tsx
interface ProfileSelectorCanvasProps {
    onProfileSelect?: (profileId: string) => void;
}
```

**Grid Layout**:
```css
/* Use CSS Grid for responsive layout */
.profile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--density-gap, 1.5rem); /* Responsive to density setting */
}
```

**Profile Switch Navigation**:
```typescript
// On card click:
const handleProfileSelect = async (profileId: string) => {
    // 1. Set active profile
    useProfileStore.getState().setActiveProfile(profileId);
    
    // 2. Navigate to home dashboard
    navigate('/dashboard'); // or '/' depending on route config
};
```

**Profile Switch Event Subscription**:
```typescript
// In ProfileSelectorCanvas useEffect:
useEffect(() => {
    const handleProfileSwitch = () => {
        fetchProfiles(); // Refresh list on profile switch
    };
    
    window.addEventListener('ledgy:profile:switch', handleProfileSwitch);
    return () => window.removeEventListener('ledgy:profile:switch', handleProfileSwitch);
}, []);
```

**Empty State**:
```typescript
// Show when profiles.length === 0
<EmptyState
    title="No profiles yet"
    description="Create your first profile to get started"
    actionLabel="Create Profile"
    onAction={() => navigate('/profiles/create')}
/>
```

**Date Formatting**:
```typescript
// Use date-fns if available, otherwise Intl.RelativeTimeFormat
import { formatDistanceToNow } from 'date-fns'; // if installed

// Fallback if date-fns not installed:
const formatRelativeTime = (timestamp: number) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return rtf.format(-days, 'day');
    if (hours > 0) return rtf.format(-hours, 'hour');
    return rtf.format(-minutes, 'minute');
};
```

### Project Structure Notes

**Profile Feature Organization**:
```
src/
├── features/
│   └── profile/
│       ├── ProfileCard.tsx           # NEW: Individual profile card
│       ├── ProfileSelectorCanvas.tsx # NEW: Grid canvas
│       └── index.ts                  # Barrel exports
├── stores/
│   └── useProfileStore.ts            # Existing: Profile state
└── components/
    └── ui/
        ├── EmptyState.tsx            # Reusable empty state
        └── LoadingSkeleton.tsx       # Reusable loading state
```

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Component Structure**: Functional components with TypeScript interfaces
- **State Management**: Use useProfileStore (Zustand) for profile data
- **Error Handling**: All errors dispatched to useErrorStore
- **Type Safety**: TypeScript strict mode
- **Styling**: Tailwind CSS v4 utility classes
- **Testing**: Vitest + React Testing Library

**Integration with Previous Stories**:
- Story 1-3: useProfileStore for profile state
- Story 1-4: Three-panel shell layout integration
- Story 1-9: App settings (theme/density) affect display
- Story 2-1: Profile DB segregation (profiles from dedicated DBs)

### Library/Framework Requirements

**Core Dependencies** (already installed):
- React 19 (Story 1-1)
- Zustand (Story 1-3)
- Tailwind CSS v4 (Story 1-1)
- React Router v7 (Story 1-2)
- date-fns (for relative time formatting - verify installation)

**DO NOT install**:
- Additional UI libraries (use existing Tailwind utilities)
- Date libraries if date-fns exists (use existing)

### Testing Standards

**Unit Tests (Vitest + React Testing Library)**:
- Co-located: `src/features/profile/ProfileCard.test.tsx`
- Co-located: `src/features/profile/ProfileSelectorCanvas.test.tsx`
- Mock useProfileStore using vi.mock()
- Test user interactions (clicks, navigation)
- Test loading and error states
- Test responsive behavior

**Critical Test Scenarios**:
1. ✅ ProfileCard renders with correct name and color
2. ✅ ProfileCard shows active state when isActive=true
3. ✅ ProfileSelectorCanvas shows empty state when no profiles
4. ✅ ProfileSelectorCanvas shows loading skeleton during fetch
5. ✅ ProfileSelectorCanvas shows error with retry button
6. ✅ Clicking card triggers navigation
7. ✅ Active profile is visually highlighted

### Git Branch Strategy

**Branch Decision**: Using `allatonce` branch for all epic implementation work.

```bash
git checkout allatonce
```

### Previous Story Intelligence

**From Story 2-1 (Profile DB Segregation Logic)**:
- ProfileDbManager created for multi-DB management
- Database naming: `ledgy-profile-{profileId}`
- Profile metadata encrypted with AES-256-GCM
- useProfileStore already has profile CRUD operations
- Profile switching emits `ledgy:profile:switch` event

**Files Created/Modified**:
- `src/lib/profileDbManager.ts` - Profile DB management
- `src/lib/profileDbManager.test.ts` - 25/25 tests passing
- `src/stores/useProfileStore.ts` - Already has profile state

**Code Review Learnings**:
- Use kebab-case for database naming (`ledgy-profile-`)
- Document singleton patterns clearly
- Propagate errors instead of swallowing
- Silence console.log in tests
- Extract magic strings to constants

### References

- [Source: architecture.md#Component Architecture](planning-artifacts/architecture.md)
- [Source: architecture.md#State Management](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: epics.md#Epic 2: Profiles & Project Management](planning-artifacts/epics.md)
- [Source: Story 2-1 Implementation](implementation-artifacts/2-1-profile-db-segregation-logic.md)

## Dev Agent Record

### Agent Model Used

BMad Method dev-story workflow

### Debug Log References

### Completion Notes List

**Implementation Summary:**
- Created 4 new components with comprehensive test coverage
- All 46 tests passing (8 + 10 + 14 + 14)
- TypeScript strict mode: no errors
- Accessibility: WCAG 2.1 AA compliant (keyboard nav, focus states, ARIA)
- Density responsive grid layout
- Profile switch event subscription for real-time updates

**Components Created:**
1. EmptyState - Reusable empty state component (8 tests)
2. LoadingSkeleton - Reusable loading skeleton (10 tests)
3. ProfileCard - Individual profile card with accessibility (14 tests)
4. ProfileSelectorCanvas - Grid canvas with state management (14 tests)

**Key Implementation Details:**
- Used Intl.RelativeTimeFormat instead of date-fns (not installed)
- ErrorBoundary wraps at route level (Story 1-2 pattern)
- Profile cards support keyboard navigation (Tab, Enter, Space)
- Active profile highlighted with animated indicator
- Density setting affects grid gap (compact: gap-4, comfortable: gap-6)
- Route constants extracted for maintainability
- Barrel exports created for clean imports

**Code Review Follow-ups Addressed:**

✅ MEDIUM Priority (3/3 fixed):
- Added ErrorBoundary documentation note (route-level wrapping)
- Extracted dashboard route to constant: DEFAULT_REDIRECT_ROUTE
- Added CSS variables for density gap with fallback

✅ LOW Priority (4/4 fixed):
- Created barrel export file: src/features/profile/index.ts
- Documented ProfileMetadata extension with @remarks
- Test spy cleanup verified (already correct)
- Added git branch note to story (in Dev Notes)

### File List

**New Components:**
- `src/components/ui/EmptyState.tsx` - Reusable empty state
- `src/components/ui/EmptyState.test.tsx` - EmptyState tests (8 tests)
- `src/components/ui/LoadingSkeleton.tsx` - Reusable loading skeleton
- `src/components/ui/LoadingSkeleton.test.tsx` - LoadingSkeleton tests (10 tests)
- `src/features/profile/ProfileCard.tsx` - Profile card component
- `src/features/profile/ProfileCard.test.tsx` - ProfileCard tests (14 tests)
- `src/features/profile/ProfileSelectorCanvas.tsx` - Profile grid canvas
- `src/features/profile/ProfileSelectorCanvas.test.tsx` - Canvas tests (14 tests)
- `src/features/profile/index.ts` - Barrel exports

**Modified Types:**
- `src/types/profile.ts` - Extended ProfileMetadata with color, avatar, lastOpened (documented)

**Total:** 10 files created/modified, 46 tests passing

---

## Technical Requirements

### Mandatory Implementation Standards

1. **Use existing git branch**: You MUST work on the `allatonce` branch.

2. **Component structure**: MUST use functional components with TypeScript interfaces.

3. **State management**: MUST use useProfileStore (Zustand) for profile data.

4. **Error handling**: MUST dispatch all errors to useErrorStore.

5. **Styling**: MUST use Tailwind CSS v4 utility classes.

6. **TypeScript strict mode**: ALL code must compile without errors.

7. **Test coverage**: ALL components MUST have unit tests.

8. **Responsive design**: MUST work on mobile and desktop.

### Next Steps

After completing this story:
1. Commit all changes to `allatonce` branch
2. Update sprint-status.yaml and COMMIT
3. Run code-review workflow for validation
4. Proceed to Story 2.3: Profile Creation Flow
