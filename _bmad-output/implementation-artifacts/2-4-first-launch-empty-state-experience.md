# Story 2.4: First-Launch Empty State Experience

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **brand-new user opening Ledgy for the first time**,
I want **an engaging, welcoming onboarding experience**,
so that **I understand the toolkit philosophy and feel guided to create my first profile without feeling lost on a blank screen**.

## Acceptance Criteria

1. On app initialization, if exactly 0 profiles exist in the database, automatically route to the First-Launch Welcome Screen.
2. The Welcome Screen must communicate Ledgy's core value (e.g., "Welcome to Ledgy. Your personal data toolkit.") and have a high-quality visual presentation (using Emerald brand accents and supportive empty-state graphics or icons).
3. The screen must feature a prominent, primary CTA button to "Create Your First Profile".
4. Clicking the CTA navigates the user directly to the Profile Creation Flow (implemented in Story 2.3).
5. The layout must be fully responsive, handling full desktop width down to 900px minimum window width.
6. Support dark mode (default) and light mode via Tailwind standard classes.
7. Accessibility: Keyboard navigable, semantic HTML, and correct ARIA roles for the welcome presentation.
8. **CRITICAL**: Developer MUST use the existing `allatonce` git branch for this epic.

## Developer Context

### Technical Requirements

**Component Structure**:
- Create a `WelcomePage.tsx` or `FirstLaunchExperience.tsx` component in `src/features/profiles/`.
- Ensure routing logic intelligently checks `useProfileStore.getState().profiles.length === 0` to decide whether to show standard UI/ProfileSelectorCanvas or `WelcomePage`.

**Routing Update**:
```tsx
// Example logic in router or ProfileSelector component
if (!isLoading && profiles.length === 0) {
    return <WelcomePage />;
}
```

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:
- **Component Structure**: Functional components with TypeScript interfaces.
- **State Management**: Use `useProfileStore` to determine profile count.
- **Error Handling**: All errors dispatched to `useErrorStore`.
- **Styling**: Tailwind CSS v4 utility classes.
- **Testing**: Vitest + React Testing Library.

### Library/Framework Requirements
- React 19, React Router v7, Zustand, Tailwind CSS v4.
- **DO NOT install** external onboarding libraries (like Shepherd or React Joyride). Build the welcome screen using standard Shadcn/Tailwind primitives.

### File Structure Requirements
- `src/features/profiles/WelcomePage.tsx` (NEW)
- `src/features/profiles/WelcomePage.test.tsx` (NEW)
- Modify `src/features/profiles/ProfileSelectorCanvas.tsx` or routing configuration to handle the 0-profile state.

### Testing Requirements
- Unit tests for `WelcomePage` rendering and accessibility.
- Integration tests ensuring that when `useProfileStore` returns 0 profiles, the user sees the WelcomePage.
- Ensure clicking the CTA navigates to the create profile route.

### Previous Story Intelligence
- Story 2.3 introduced `ProfileCreationPage` at a specific route (e.g., `/profiles/create`). Ensure the Welcome CTA points precisely there.
- The `allatonce` branch contains all recent changes. Pull the latest before starting to ensure 2.3 changes are present.

### Git Intelligence Summary
Recent commits show that `ProfileSelectorCanvas` (Story 2.2) and Profile Creation Flow (Story 2.3) are completed. This story slots perfectly in between by handling the absolute edge case of a fresh installation before the selector canvas is useful.

### Project Context Reference
- [Source: architecture.md](planning-artifacts/architecture.md)
- [Source: ux-design-specification.md](planning-artifacts/ux-design-specification.md)
- [Source: product-brief-ledgy-2026-02-20.md](planning-artifacts/product-brief-ledgy-2026-02-20.md)

---

## Tasks and Subtasks

- [x] Task 1: Create `WelcomePage.tsx` component in `src/features/profiles/`
  - [x] 1.1: Build the full-page welcome layout with Emerald brand accents and dark/light mode support
  - [x] 1.2: Add Ledgy brand headline ("Welcome to Ledgy. Your personal data toolkit.") with gradient typography
  - [x] 1.3: Add prominent primary CTA button "Create Your First Profile" that navigates to `/profiles/new`
  - [x] 1.4: Include empty-state icon/graphic (using lucide-react icons, e.g. `DatabaseZap` or `Sparkles`)
  - [x] 1.5: Add theme toggle in top-right corner (consistent with `ProfileSelector.tsx` pattern)
  - [x] 1.6: Ensure semantic HTML with proper ARIA roles (`role="main"`, `aria-label`, etc.) and keyboard navigability

- [x] Task 2: Modify `ProfileSelector.tsx` to detect zero-profile state
  - [x] 2.1: After `fetchProfiles()` resolves, if `!isLoading && profiles.length === 0`, render `<WelcomePage />` instead
  - [x] 2.2: Ensure the loading state is handled before the check (do not flash welcome screen while loading)

- [x] Task 3: Write tests for `WelcomePage.tsx` in `src/features/profiles/WelcomePage.test.tsx`
  - [x] 3.1: Test that `WelcomePage` renders correctly with brand headline and CTA button
  - [x] 3.2: Test CTA button navigates to `/profiles/new` on click
  - [x] 3.3: Test that `ProfileSelector` renders `WelcomePage` when store returns 0 profiles
  - [x] 3.4: Test that `ProfileSelector` renders the profile grid when profiles exist (regression check)
  - [x] 3.5: Test keyboard accessibility (CTA is focusable and activatable via Enter/Space)

---

## Dev Agent Record

### Agent Model Used
BMad Method create-story workflow

### Completion Notes List
**Story Context Engine Analysis Completed**:
- Epic 2 story 4 identified: First-Launch Empty State Experience
- Previous stories analyzed (2-2, 2-3)
- UX design requirements integrated (Empty States & Loading)
- Technical requirements defined
- Git branch strategy confirmed: `allatonce`

**Key Implementation Guidance**:
1. Check profile count on load
2. Show WelcomePage if 0 profiles
3. Guide to ProfileCreationPage

**Implementation Completed (2026-03-07)**:
- Created `WelcomePage.tsx`: Full-page welcome screen with Ledgy brand gradient headline, `DatabaseZap` + `Sparkles` icon, 3 feature pills, emerald CTA button with arrow animation, theme toggle, ambient background glows, semantic HTML with `role="main"` and proper `aria-label` on all interactive elements.
- Modified `ProfileSelector.tsx`: Added `import { WelcomePage }` and guard `if (!isLoading && profiles.length === 0) return <WelcomePage />` after profile state destructuring.
- Created `WelcomePage.test.tsx`: 12 tests covering rendering, CTA navigation to `/profiles/new`, keyboard accessibility, ARIA landmark, and ProfileSelector integration (0-profile state, loading guard, regression with profiles).

**Test Results**: 12/12 new tests pass ✅ | 3/3 existing ProfileSelector tests pass ✅ | No regressions in profiles feature.

---

## File List

- `src/features/profiles/WelcomePage.tsx` (NEW)
- `src/features/profiles/WelcomePage.test.tsx` (NEW)
- `src/features/profiles/ProfileSelector.tsx` (MODIFIED - added WelcomePage import and zero-profile guard)

## Change Log

- 2026-03-07: Implemented First-Launch Empty State Experience. Created WelcomePage component with Ledgy brand welcome screen, integrated into ProfileSelector to show when 0 profiles exist. Added 12 tests covering all ACs. Story set to review.
