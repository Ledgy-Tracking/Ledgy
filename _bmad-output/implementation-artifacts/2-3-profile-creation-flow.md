# Story 2.3: Profile Creation Flow

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **new user setting up ledgy for the first time**,
I want **a simple, guided flow to create my first profile**,
so that **I can start tracking my data without confusion or overwhelm**.

## Acceptance Criteria

1. Profile creation UI accessible from Profile Selector Canvas empty state
2. Form captures profile name (required) and optional color/avatar selection
3. Profile name validation (unique, non-empty, max 50 characters)
4. Visual color picker with 8-12 preset colors (from design system)
5. Avatar/initials auto-generated from profile name (with optional manual override)
6. Success state navigates to newly created profile's home dashboard
7. Error handling for duplicate names or creation failures
8. TypeScript strict mode compiles without errors
9. Unit tests cover form validation, submission, and error states
10. Integration with useProfileStore and ProfileDbManager (Story 2-1)
11. Accessibility: Form labels, error announcements, keyboard navigation, WCAG 2.1 AA
12. Density responsive: Form spacing adjusts based on density setting (Story 1-9)
13. **CRITICAL**: Developer MUST use the existing `main` git branch for this epic

## Tasks / Subtasks

- [ ] Task 1: Create ProfileCreationForm component (AC: #1, #2, #3, #4, #5)
  - [ ] Create `src/features/profile/ProfileCreationForm.tsx`
  - [ ] Form with controlled inputs (name, color, avatar)
  - [ ] Profile name validation (required, unique, maxLength: 50)
  - [ ] Color picker with preset colors from design tokens
  - [ ] Avatar preview with auto-generated initials
  - [ ] Manual avatar/initials override input
  - [ ] Real-time validation feedback
- [ ] Task 2: Create ProfileCreationPage route (AC: #1, #6, #7)
  - [ ] Create `src/features/profile/ProfileCreationPage.tsx`
  - [ ] Route configuration in App.tsx or router config
  - [ ] Integrate ProfileCreationForm
  - [ ] Handle successful creation → navigate to dashboard
  - [ ] Handle errors → display user-friendly message
  - [ ] Add cancel button → return to profile selector
- [ ] Task 3: Extend useProfileStore with creation actions (AC: #10)
  - [ ] Add `createProfile(name, color, avatar)` action
  - [ ] Integrate with ProfileDbManager.createProfile()
  - [ ] Handle loading states
  - [ ] Dispatch errors to useErrorStore
  - [ ] Auto-switch to created profile on success
- [ ] Task 4: Write unit tests (AC: #8, #9, #11)
  - [ ] Test form rendering
  - [ ] Test name validation (empty, duplicate, too long)
  - [ ] Test color selection
  - [ ] Test avatar auto-generation
  - [ ] Test form submission success
  - [ ] Test form submission error
  - [ ] Test keyboard navigation
  - [ ] Test accessibility (labels, error announcements)
- [ ] Task 5: Verify TypeScript and integration (AC: #8, #10, #12)
  - [ ] TypeScript strict mode: no errors
  - [ ] Integration with useProfileStore
  - [ ] Integration with ProfileDbManager
  - [ ] Density setting integration (Story 1-9)
  - [ ] Error boundary integration (Story 1-2)
  - [ ] Responsive design verification

## Dev Notes

### Critical Technical Requirements

**Component Structure**:
```typescript
// ProfileCreationForm.tsx
interface ProfileCreationFormProps {
    onCancel?: () => void;
    onSuccess?: (profileId: string) => void;
}

interface ProfileCreationFormData {
    name: string;
    color: string;
    avatar: string; // Initials or emoji
}
```

**Form Validation Rules**:
```typescript
const validationSchema = {
    name: {
        required: true,
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9\s\-_]+$/, // Alphanumeric, spaces, hyphens, underscores
        unique: true // Check against existing profiles
    },
    color: {
        required: false, // Auto-assign if not selected
        presetColors: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1']
    },
    avatar: {
        required: false, // Auto-generate from name
        maxLength: 2 // Initials only
    }
};
```

**Auto-Generated Initials Logic**:
```typescript
const generateInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};
```

**Profile Creation Flow**:
```typescript
const handleSubmit = async (data: ProfileCreationFormData) => {
    try {
        setIsLoading(true);
        
        // Check for duplicate name
        const profiles = await useProfileStore.getState().getProfiles();
        const exists = profiles.some(p => p.name.toLowerCase() === data.name.toLowerCase());
        if (exists) {
            throw new Error('Profile name already exists');
        }
        
        // Create profile via ProfileDbManager
        const profile = await useProfileStore.getState().createProfile(data.name, data.color, data.avatar);
        
        // Auto-switch to new profile
        await useProfileStore.getState().setActiveProfile(profile.id);
        
        // Navigate to dashboard
        navigate('/dashboard');
        
        onSuccess?.(profile.id);
    } catch (error) {
        useErrorStore.getState().setError('Failed to create profile', error);
    } finally {
        setIsLoading(false);
    }
};
```

### Project Structure Notes

**Profile Feature Organization**:
```
src/
├── features/
│   └── profile/
│       ├── ProfileCard.tsx                    # Story 2-2
│       ├── ProfileSelectorCanvas.tsx          # Story 2-2
│       ├── ProfileCreationForm.tsx            # NEW: Creation form
│       ├── ProfileCreationPage.tsx            # NEW: Route page
│       └── index.ts                           # Barrel exports
├── stores/
│   └── useProfileStore.ts                     # Extended with createProfile action
├── lib/
│   └── profileDbManager.ts                    # Story 2-1: DB management
└── components/
    └── ui/
        ├── ColorPicker.tsx                    # NEW: Reusable color picker
        └── Avatar.tsx                         # NEW: Avatar display component
```

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Component Structure**: Functional components with TypeScript interfaces
- **State Management**: Use useProfileStore (Zustand) for profile data
- **Error Handling**: All errors dispatched to useErrorStore
- **Type Safety**: TypeScript strict mode
- **Styling**: Tailwind CSS v4 utility classes
- **Testing**: Vitest + React Testing Library
- **Naming**: `camelCase` for functions, `PascalCase` for components/interfaces
- **PouchDB Document Naming**: Use `profile-{uuid}` convention (Story 2-1)

**Integration with Previous Stories**:
- Story 1-2: Error boundaries wrap routes
- Story 1-3: useProfileStore extension
- Story 1-9: App settings (theme/density) affect display
- Story 2-1: ProfileDbManager for DB creation
- Story 2-2: ProfileSelectorCanvas empty state links to creation

### Library/Framework Requirements

**Core Dependencies** (already installed):
- React 19 (Story 1-1)
- Zustand (Story 1-3)
- Tailwind CSS v4 (Story 1-1)
- React Router v7 (Story 1-2)
- PouchDB (Story 1-5)

**DO NOT install**:
- Additional UI libraries (use existing Tailwind utilities)
- Form libraries (use controlled inputs or simple state)

### Testing Standards

**Unit Tests (Vitest + React Testing Library)**:
- Co-located: `src/features/profile/ProfileCreationForm.test.tsx`
- Co-located: `src/features/profile/ProfileCreationPage.test.tsx`
- Mock useProfileStore and ProfileDbManager
- Test form validation and submission
- Test error handling
- Test accessibility

**Critical Test Scenarios**:
1. ✅ Form renders with all fields
2. ✅ Name validation (empty, duplicate, too long)
3. ✅ Color picker selection
4. ✅ Avatar auto-generation from name
5. ✅ Manual avatar override
6. ✅ Successful form submission
7. ✅ Error handling on submission failure
8. ✅ Keyboard navigation (Tab, Enter)
9. ✅ Accessibility (labels, error announcements)

### Git Branch Strategy

**CRITICAL**: You MUST work on the `main` branch for this epic.

```bash
git checkout main
```

**Before starting**:
```bash
git pull origin main
```

**After completion**:
```bash
git add .
git commit -m "feat: Profile creation flow (Story 2.3)"
git push origin main
```

### Previous Story Intelligence

**From Story 2-1 (Profile DB Segregation Logic)**:
- ProfileDbManager created for multi-DB management
- Database naming: `ledgy-profile-{profileId}`
- Profile metadata schema includes: name, color, avatar, createdAt, updatedAt
- useProfileStore already has profile CRUD operations
- Profile switching emits `ledgy:profile:switch` event

**From Story 2-2 (Profile Selector Canvas)**:
- ProfileCard component displays profile with color/avatar
- ProfileSelectorCanvas shows empty state with "Create Profile" link
- EmptyState component available for reuse
- Grid layout responsive to density settings
- Profile list fetched from useProfileStore

**Files Created/Modified**:
- `src/lib/profileDbManager.ts` - Profile DB management
- `src/stores/useProfileStore.ts` - Profile state with CRUD
- `src/features/profile/ProfileCard.tsx` - Profile card display
- `src/features/profile/ProfileSelectorCanvas.tsx` - Profile grid
- `src/components/ui/EmptyState.tsx` - Reusable empty state
- `src/components/ui/LoadingSkeleton.tsx` - Reusable loading skeleton

**Code Review Learnings**:
- Use kebab-case for database naming (`ledgy-profile-`)
- Extract magic strings to constants
- Propagate errors instead of swallowing
- Silence console.log in tests
- Document singleton patterns clearly

### UX Design Compliance

**From ux-design-specification.md**:

**Color System**:
- Use Emerald (`#10b981`) as primary brand accent
- Preset colors should include: Emerald, Blue, Violet, Pink, Amber, Red, Teal, Indigo
- Dark mode primary (zinc-950 background)

**Accessibility**:
- WCAG 2.1 AA contrast ratios
- Focus rings: 2px, offset-2, emerald-500
- All interactive elements keyboard-navigable
- Form labels required for all inputs
- Error announcements for screen readers

**Emotional Design**:
- "Canvas, not form" - Make creation feel like building, not data entry
- "Show before save" - Preview profile appearance before confirmation
- "Empowered Authorship" - User feels ownership of their creation

### References

- [Source: architecture.md#Data Architecture](planning-artifacts/architecture.md)
- [Source: architecture.md#Component Architecture](planning-artifacts/architecture.md)
- [Source: architecture.md#State Management](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: epics.md#Epic 2: Profiles & Project Management](planning-artifacts/epics.md)
- [Source: ux-design-specification.md#Visual Design Foundation](planning-artifacts/ux-design-specification.md)
- [Source: Story 2-1 Implementation](implementation-artifacts/2-1-profile-db-segregation-logic.md)
- [Source: Story 2-2 Implementation](implementation-artifacts/2-2-profile-selector-canvas.md)

## Dev Agent Record

### Agent Model Used

BMad Method create-story workflow

### Debug Log References

### Completion Notes List

**Story Context Engine Analysis Completed**:
- Epic 2 story 3 identified: Profile Creation Flow
- Previous stories analyzed (2-1, 2-2)
- Architecture patterns extracted
- UX design requirements integrated
- Technical requirements defined
- Test scenarios specified
- Git branch strategy confirmed: `main`

**Key Implementation Guidance**:
1. Extend useProfileStore with createProfile action (integrates with ProfileDbManager)
2. Create ProfileCreationForm with validation
3. Create ProfileCreationPage route
4. Auto-generate avatar initials from name
5. Provide color picker with design system presets
6. Navigate to dashboard on success
7. Handle errors gracefully with useErrorStore
8. Ensure accessibility compliance (WCAG 2.1 AA)

**Developer Next Steps**:
1. Review this comprehensive story context
2. Ensure you are on the `main` branch
3. Implement profile creation flow following all specified patterns
4. Write comprehensive tests
5. Verify TypeScript strict mode
6. Run code-review when complete

### File List

**Expected Files to Create/Modify**:
- `src/features/profile/ProfileCreationForm.tsx` - NEW: Creation form
- `src/features/profile/ProfileCreationForm.test.tsx` - NEW: Form tests
- `src/features/profile/ProfileCreationPage.tsx` - NEW: Route page
- `src/features/profile/ProfileCreationPage.test.tsx` - NEW: Page tests
- `src/components/ui/ColorPicker.tsx` - NEW: Color picker (optional reusable)
- `src/components/ui/Avatar.tsx` - NEW: Avatar component (optional reusable)
- `src/stores/useProfileStore.ts` - MODIFY: Add createProfile action
- `src/features/profile/index.ts` - MODIFY: Add new exports

---

## Technical Requirements

### Mandatory Implementation Standards

1. **Use existing git branch**: You MUST work on the `main` branch.

2. **Component structure**: MUST use functional components with TypeScript interfaces.

3. **State management**: MUST use useProfileStore (Zustand) for profile data.

4. **Error handling**: MUST dispatch all errors to useErrorStore.

5. **Styling**: MUST use Tailwind CSS v4 utility classes.

6. **TypeScript strict mode**: ALL code must compile without errors.

7. **Test coverage**: ALL components MUST have unit tests.

8. **Responsive design**: MUST work on mobile and desktop.

9. **Accessibility**: MUST meet WCAG 2.1 AA standards.

10. **Density responsive**: MUST integrate with density setting (Story 1-9).

### Next Steps

After completing this story:
1. Commit all changes to `main` branch
2. Update sprint-status.yaml and COMMIT
3. Run code-review workflow for validation
4. Proceed to Story 2.4: First-Launch Empty State Experience
