# Story 2.2: Profile Selector UI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see all my profiles on a selector screen after unlocking,
so that I can choose which workspace to enter.

## Acceptance Criteria

1. **Route Mapping:** Profile selector screen renders at `/profiles`. [Source: epics.md#Story 2.2]
2. **Access Control:** The screen is only accessible after the user successfully unlocks the app. [Source: epics.md#Story 2.2]
3. **Profile List:** All existing profiles are listed with their name and creation date. [Source: epics.md#Story 2.2]
4. **Active Selection:** Clicking a profile sets it as active in `useProfileStore` and navigates to `/app/:profileId/`. [Source: epics.md#Story 2.2]
5. **CTA for New Profile:** A "New Profile" button is prominently visible to create additional profiles. [Source: epics.md#Story 2.2]

## Tasks / Subtasks

- [x] Task 1: UI Component Development (AC: 3, 5)
  - [x] Create `ProfileSelector` component in `src/features/profiles/`.
  - [x] Create `ProfileCard` sub-component (stylized as interactive cards within `ProfileSelector.tsx`).
  - [x] Implement an empty state when no profiles exist.
- [x] Task 2: State & Navigation (AC: 1, 4)
  - [x] Wire `useProfileStore` to the selection logic.
  - [x] Update `App.tsx` routes to include `/profiles`.
  - [x] Implement redirection to `/app/:profileId/` on selection.
- [x] Task 3: UI Adjustments
  - [x] Integrate with auth layer properly.

### Review Follow-ups (AI)
- [x] [AI-Review][High] Fix the theme (dark or light mode) selection as it is currently not working.

## Dev Notes

- **Design System:** Use `shadcn/ui` components (Card, Button, Skeleton). Themed with Tailwind CSS. [Source: Architecture.md#Design System]
- **Typography:** Inter/Geist. [Source: Architecture.md#Design System]
- **Transitions:** Use smooth transitions (<150ms). [Source: UX Design Spec#Motion]
- **Empty State:** If no profiles exist, show the "New Profile" button prominently.

### Project Structure Notes

- Components should be in `src/features/profiles/`.
- Routing logic in `src/App.tsx` or a dedicated `routes.tsx` if refactored.

### References

- [Source: planning-artifacts/epics.md#Story 2.2]
- [Source: planning-artifacts/architecture.md#Auth Gate]
- [Source: planning-artifacts/ux-design-specification.md#Colour Tokens]

## Dev Agent Record

### Agent Model Used

Antigravity (Gemini 2.0 Flash Thinking)

### Debug Log References

- Implemented `ProfileSelector` with a stunning dark-mode design and micro-animations.
- Used `lucide-react` for iconography.
- Integrated `deleteProfile` with confirmation dialog.
- Wired `/profiles` route in `App.tsx` and wrapped with `AuthGuard`.

### Completion Notes List

- ✅ Route mapping for `/profiles` completed.
- ✅ Auth guarding verified for profile selection.
- ✅ Profile list rendering with name, description, and creation date.
- ✅ Active selection navigation to `/app/:profileId`.
- ✅ "New Profile" button functional for quick creation.
- ✅ Resolved review finding [High]: Fix the theme (dark or light mode) selection as it is currently not working.

### File List

- `src/features/profiles/ProfileSelector.tsx`
- `src/features/profiles/ProfileSelector.test.tsx`
- `src/App.tsx`
