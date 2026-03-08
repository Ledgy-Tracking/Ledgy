# Story 1.4: Three-Panel Shell Layout

Status: ready-for-dev

<!-- Note: Validation is recommended. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **a responsive three-panel shell layout with sidebar, main canvas, and inspector rail**,
so that **I can efficiently navigate the application, work in the main content area, and access contextual tools**.

## Acceptance Criteria

1. Three-panel layout implemented: sidebar (navigation), main canvas (content), inspector rail (tools)
2. Sidebar contains navigation menu with profile switcher, projects, ledger, node forge, dashboard, settings
3. Main canvas renders route-based content (projects, ledger views, node editor, dashboard)
4. Inspector rail provides contextual tools based on active view
5. All panels are collapsible with smooth animations
6. Layout is responsive and adapts to different screen sizes
7. Panel widths/sizes are persisted in useUIStore
8. Layout integrates with existing ErrorBoundary and AuthGuard
9. Tailwind CSS utility classes used for all styling
10. TypeScript strict mode compiles without errors
11. Unit tests cover layout behavior and panel state
12. Keyboard shortcuts for panel toggling (Cmd+B sidebar, Cmd+I inspector)

## Tasks / Subtasks

- [ ] Task 1: Create AppShell component structure (AC: #1, #8)
  - [ ] Create `src/features/shell/AppShell.tsx` with three-panel layout
  - [ ] Integrate with existing ErrorBoundary from Story 1-2
  - [ ] Wrap content with AuthGuard from Story 1-2
  - [ ] Set up CSS Grid or Flexbox layout structure
- [ ] Task 2: Implement sidebar navigation (AC: #2, #5, #6)
  - [ ] Create `src/features/shell/Sidebar.tsx` component
  - [ ] Add navigation menu items (Projects, Ledger, Node Forge, Dashboard, Settings)
  - [ ] Implement collapsible state with animation
  - [ ] Add responsive behavior (hide on mobile by default)
  - [ ] Add hamburger menu trigger for mobile access
  - [ ] Integrate profile switcher trigger
- [ ] Task 3: Implement main canvas area (AC: #3, #6)
  - [ ] Create `src/features/shell/MainCanvas.tsx` component
  - [ ] Set up Outlet for route-based content rendering
  - [ ] Implement responsive padding and sizing
  - [ ] Add loading state placeholder
  - [ ] Add "collapse all panels" button for maximum canvas space (optional)
- [ ] Task 4: Implement inspector rail (AC: #4, #5, #6)
  - [ ] Create `src/features/shell/InspectorRail.tsx` component
  - [ ] Implement contextual tools placeholder
  - [ ] Add collapsible state with animation
  - [ ] Set up responsive behavior (hidden on mobile/tablet)
  - [ ] Add min/max width constraints (min: 200px, max: 480px)
- [ ] Task 5: Create layout state management (AC: #7, #12)
  - [ ] Check if useUIStore exists - extend if exists, create if needed
  - [ ] Add layout state: sidebarOpen, inspectorOpen, panelWidths
  - [ ] Implement actions: toggleSidebar, toggleInspector, setPanelWidth
  - [ ] Add localStorage persistence for layout preferences
  - [ ] Implement keyboard shortcuts (Cmd+B, Cmd+I) with proper cleanup on unmount
  - [ ] Add panel width constraints validation (min/max bounds)
- [ ] Task 6: Add responsive breakpoints (AC: #6)
  - [ ] Define Tailwind breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
  - [ ] Mobile: sidebar and inspector hidden by default
  - [ ] Tablet: sidebar collapsible, inspector hidden
  - [ ] Desktop: all panels visible and resizable
- [ ] Task 7: Write unit tests (AC: #11)
  - [ ] Test AppShell renders three panels
  - [ ] Test sidebar toggle behavior
  - [ ] Test inspector toggle behavior
  - [ ] Test responsive breakpoints
  - [ ] Test keyboard shortcuts
  - [ ] Test layout persistence
- [ ] Task 8: Verify TypeScript and styling (AC: #9, #10)
  - [ ] TypeScript strict mode: no errors
  - [ ] All styling via Tailwind CSS utility classes
  - [ ] No ad-hoc CSS files created

## Dev Notes

### Critical Technical Requirements

**Layout Pattern** (per architecture.md):
```typescript
// Three-panel layout using CSS Grid or Flexbox
// Sidebar: 240-320px (collapsible)
// Main Canvas: flex-grow (100% remaining space)
// Inspector Rail: 280-360px (collapsible)
```

**Responsive Breakpoints**:
```
Mobile (<768px):   [Canvas only] - panels hidden by default
Tablet (768-1024): [Sidebar][Canvas] - inspector hidden
Desktop (>1024px): [Sidebar][Canvas][Inspector] - all visible
```

**State Management** (per Story 1-3):
```typescript
// All layout state in useUIStore - NO local useState
// Persist panel widths and open/closed state
// Error handling via useErrorStore dispatch
```

### Project Structure Notes

**Component Organization**:
```
src/
├── features/
│   └── shell/
│       ├── AppShell.tsx         # Main three-panel layout
│       ├── Sidebar.tsx          # Navigation sidebar
│       ├── MainCanvas.tsx       # Main content area
│       ├── InspectorRail.tsx    # Contextual tools
│       └── useShellLayout.ts    # Layout state hooks (optional)
└── stores/
    └── useUIStore.ts            # Extended with layout state
```

**Alignment with architecture.md**:
- Feature folders use `camelCase`: `src/features/shell/`
- Components use `PascalCase`: `AppShell.tsx`, `Sidebar.tsx`
- Hooks use `useCamelCase`: `useShellLayout` (if needed)
- Tests co-located: `AppShell.test.tsx` next to `AppShell.tsx`

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Naming**: `camelCase` for variables, `PascalCase` for components
- **Structure**: Feature-first organization
- **Tests**: Co-located with source files
- **Styling**: Tailwind CSS utility-first, NO ad-hoc CSS
- **State**: Zustand stores only - no local useState for layout state
- **Error Handling**: Errors dispatched to useErrorStore

**Integration with Previous Stories**:
- Story 1-2: ErrorBoundary wraps AppShell, AuthGuard protects routes
- Story 1-3: useUIStore follows store topology pattern

### Library/Framework Requirements

**Core Dependencies** (already installed):
- `react`: ^19.0.0
- `react-router-dom`: ^7.0.0 (for Outlet component)
- `zustand`: Latest stable (useUIStore)
- `tailwindcss`: Latest (all styling)

**DO NOT install**:
- Additional layout libraries (use Tailwind/CSS Grid)
- Animation libraries (use Tailwind transitions)

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located: `src/features/shell/AppShell.test.tsx`
- Test component rendering
- Test panel toggle behavior
- Test responsive breakpoints (mock window width)
- Test keyboard shortcuts
- Test persistence (mock localStorage)

**Critical Test Scenarios**:
1. ✅ AppShell renders with correct three-panel structure
2. ✅ Sidebar toggles open/closed
3. ✅ Inspector toggles open/closed
4. ✅ Layout responds to screen size changes
5. ✅ Keyboard shortcuts trigger panel toggles
6. ✅ Layout preferences persist across reloads
7. ✅ Panel width constraints enforced (min/max)
8. ✅ Keyboard event listeners cleaned up on unmount
9. ✅ Mobile hamburger menu triggers sidebar

### Git Branch Strategy

**Branch Decision**: Using `main` branch for all epic implementation work.

```bash
git checkout main
```

### Previous Story Intelligence

**From Story 1-2 (React Router & Error Boundaries)**:
- ErrorBoundary component available for wrapping AppShell
- AuthGuard protects all routes except /setup and /unlock
- ErrorToast integration working

**From Story 1-3 (Zustand Store Topology)**:
- useUIStore pattern established
- All state in stores - no local useState
- Error dispatch pattern: useErrorStore.getState().dispatchError()

**Code Patterns to Reuse**:
- Component structure from Story 1-2
- Store pattern from Story 1-3
- Test structure from both stories

### References

- [Source: architecture.md#Frontend Architecture](planning-artifacts/architecture.md)
- [Source: architecture.md#Complete Project Directory Structure](planning-artifacts/architecture.md)
- [Source: architecture.md#Process Patterns](planning-artifacts/architecture.md)
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

1. **Use existing git branch**: You MUST work on the `main` branch.

2. **No local useState for layout state**: All panel open/closed state MUST be in useUIStore.

3. **Tailwind CSS only**: NO ad-hoc CSS files - use utility classes exclusively.

4. **Responsive design**: Layout MUST work on mobile, tablet, and desktop breakpoints.

5. **Keyboard shortcuts**: Cmd+B (sidebar), Cmd+I (inspector) MUST be implemented.

6. **Persistence**: Panel widths and open/closed state MUST persist in localStorage.

7. **TypeScript strict mode**: All code must compile without errors.

8. **Test co-location**: All tests MUST be co-located with source files.

### Next Steps

After completing this story:
1. Commit all changes to `main` branch
2. Update sprint-status.yaml to mark this story as "done"
3. Proceed to Story 1.5: PouchDB Core Initialization
