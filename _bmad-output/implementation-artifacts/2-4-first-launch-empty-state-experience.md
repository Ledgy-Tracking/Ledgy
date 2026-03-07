# Story 2.4: First-Launch Empty State Experience

Status: ready-for-dev

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

**Developer Next Steps**:
1. Review this comprehensive story context
2. Ensure you are on the `allatonce` branch
3. Implement WelcomePage following all specified patterns
4. Write comprehensive tests
5. Run code-review when complete
