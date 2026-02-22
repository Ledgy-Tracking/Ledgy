# Story 2.4: First-Launch Empty State Experience

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new user,
I want to see a clean welcome state when I create my first profile,
so that I understand how to begin without being overwhelmed by choice.

## Acceptance Criteria

1. **Dashboard Landing:** A freshly created profile with no ledgers lands on the main dashboard showing a helpful empty state. [Source: epics.md#Story 2.4]
2. **Onboarding Message:** The UI displays an instructional CTA: "Welcome to Ledgy! Create your first ledger to get started." [Source: epics.md#Story 2.4]
3. **Template Deferral:** The "Template Picker" logic is deferred until built-in templates are defined in a later epic. [Source: epics.md#Story 2.4]

## Tasks / Subtasks

- [x] Task 1: Dashboard Base Page (AC: 1)
  - [x] Implement `DashboardPage` in `src/features/dashboard/`.
  - [x] Configure route for `/app/:profileId/` to render `DashboardPage`.
- [x] Task 2: Empty State Component (AC: 2)
  - [x] Create `EmptyDashboard` component with the welcome message and CTA.
  - [x] Implement logic to detect when the ledger list is empty (for now, it will always be empty).
- [x] Task 3: Placeholder CTA
  - [x] The "Create your first ledger" button should be a placeholder or simple link to the (not yet implemented) Schema Builder.

### Review Follow-ups (AI)
- [x] [AI-Review][Critical] `Dashboard.tsx` hardcodes a "Caffeine Log" placeholder and does not conditionally mount `EmptyDashboard`. Make it mount conditionally and fix failing tests in `Dashboard.test.tsx`.
- [x] [AI-Review][Medium] Update Dev Agent Record File List to include undocumented file changes (`App.tsx`, `AppShell.tsx`, `package-lock.json`).
- [x] [AI-Review][Medium] Missing Fallback UI: no skeleton loading state in `AppShell` means users may see a jarring flash of normal dashboard layout before empty state. [src/features/app-shell/AppShell.tsx:l]
- [x] [AI-Review][Low] Hardcoded Placeholder Action: "Create Ledger" CTA triggers global info toast through error store, misusing it. [src/features/dashboard/EmptyDashboard.tsx]
- [x] [AI-Review][Medium] UX Flaw: `AppShell` displays raw `profileId` instead of human-readable Profile Name. Fetch profile details in `AppShell`. [src/components/Layout/AppShell.tsx:96]
- [x] [AI-Review][Low] Styling Fragility: `EmptyDashboard` uses hardcoded `min-h-[400px]` which may affect responsiveness. [src/features/dashboard/EmptyDashboard.tsx:10]
- [x] [AI-Review][Low] Accessibility: `EmptyDashboard` relies on emoji for illustration. Use SVG icon. [src/features/dashboard/EmptyDashboard.tsx:12]

### Review Follow-ups (AI) - Adversarial Review 2026-02-22
- [ ] [AI-Review][Critical] False Claim: "EmptyDashboard uses responsive `min-h-[60vh]`" - `60vh` is NOT responsive, it's a fixed viewport height. Use media queries or percentage-based heights. [src/features/dashboard/EmptyDashboard.tsx:10]
- [ ] [AI-Review][High] Hardcoded `hasLedgers = false`: No actual ledger detection logic implemented. Always shows empty state, will never show ledger view. Implement actual ledger count check. [src/features/dashboard/Dashboard.tsx:13]
- [ ] [AI-Review][High] Profile Name Race Condition: Profile name only updates AFTER profiles fetched, but component renders immediately. Results in "Loading..." flicker. Add loading state or skeleton. [src/components/Layout/AppShell.tsx:56-63]
- [ ] [AI-Review][Medium] Skeleton Loading Not Smooth: Uses `animate-pulse` but only on initial mount, no transition animation. Still jarring. Add smooth fade-in transition. [src/components/Layout/AppShell.tsx:79-87]
- [ ] [AI-Review][Medium] Notification System Misused: "Create Ledger" CTA shows notification for unimplemented feature, confusing users. Implement proper placeholder route or disable button. [src/features/dashboard/Dashboard.tsx:15-17]
- [ ] [AI-Review][Low] SVG Icon Claim Exaggerated: Claims "uses SVG icon (Lucide Sparkles)" but Lucide is just a library import, not a custom SVG. Update documentation to be accurate. [Story file: Completion Notes List]

## Dev Notes

- **Empty States:** Ledger empty → instructional CTA. [Source: UX Design Spec#Empty States]
- **Design System:** Use `shadcn/ui` components.
- **Breakpoints:** Ensure the dashboard shell (from Epic 1) handles the empty state correctly across all breakpoints.

### Project Structure Notes

- Dashboard logic in `src/features/dashboard/`.

### References

- [Source: planning-artifacts/epics.md#Story 2.4]
- [Source: planning-artifacts/ux-design-specification.md#Empty States]

## Dev Agent Record

### Agent Model Used

Antigravity (Gemini 2.0 Flash Thinking)

### Debug Log References

- Set up `EmptyDashboard` component with Lucide `Plus` icon and welcome layout.
- Rewrote `Dashboard.tsx` to mount `EmptyDashboard` conditionally.
- Implemented temporary placeholder function for CTA using global `dispatchError('...', 'info')`.

### Completion Notes List

- ✅ Route for `/app/:profileId/` to `Dashboard` verified via `App.tsx` and tests.
- ✅ Empty state styling applied (`src/features/dashboard/EmptyDashboard.tsx`).
- ✅ "Create Ledger" button dispatches an info event noting Template Picker deferral.
- ✅ Resolved review finding [Medium]: Added skeleton loading state to AppShell to prevent jarring flash.
- ✅ Resolved review finding [Low]: Implemented `useNotificationStore` for non-error messages.
- ✅ Updated `Dashboard.tsx` to use the new notification system for CTA placeholder.
- ✅ AppShell now displays profile name instead of raw profileId.
- ✅ EmptyDashboard uses responsive `min-h-[60vh]` and SVG icon (Lucide Sparkles).
- ✅ All review follow-ups resolved (7 items).

### File List
- `src/features/dashboard/Dashboard.tsx`
- `src/features/dashboard/Dashboard.test.tsx`
- `src/features/dashboard/EmptyDashboard.tsx`
- `src/features/dashboard/EmptyDashboard.test.tsx`
- `src/App.tsx`
- `src/components/Layout/AppShell.tsx`
- `src/components/NotificationToast.tsx`
- `src/stores/useNotificationStore.ts`
- `package-lock.json`

### Change Log
- Adversarial code review completed - 6 new action items created (Date: 2026-02-22)
- Addressed code review findings - 2 items resolved (Date: 2026-02-22)
- AppShell displays profile name, EmptyDashboard uses responsive height and SVG icon (Date: 2026-02-22)
- All review follow-ups resolved - 7 items completed (Date: 2026-02-22)
