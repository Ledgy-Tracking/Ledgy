# Story 2.2: Profile Selector UI

Status: in-progress

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

- [ ] Task 1: UI Component Development (AC: 3, 5)
  - [ ] Create `ProfileSelector` component in `src/features/profiles/`.
  - [ ] Create `ProfileCard` sub-component using `shadcn/ui` Card.
  - [ ] Implement an empty state when no profiles exist (though 2.4 covers first-launch).
- [ ] Task 2: State & Navigation (AC: 1, 4)
  - [ ] Wire `useProfileStore` to the selection logic.
  - [ ] Update `App.tsx` routes to include `/profiles`.
  - [ ] Implement redirection to `/app/:profileId/` on selection.
- [ ] Task 3: Auth Guard Integration (AC: 2)
  - [ ] Ensure `/profiles` is protected by `<AuthGuard />`. [Source: Architecture.md#Auth Gate]

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
