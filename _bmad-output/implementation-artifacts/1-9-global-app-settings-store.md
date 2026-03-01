# Story 1.9: Global App Settings Store

Status: ready-for-dev

<!-- Note: Validation is recommended. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **global application settings that persist across sessions**,
so that **my UI preferences (theme, density, etc.) are automatically applied every time I use the app**.

## Acceptance Criteria

1. Settings store with theme (light/dark), density (comfortable/compact), and other UI preferences
2. Settings persist in localStorage using Zustand persist middleware
3. Theme toggle switches between light and dark modes
4. Density toggle switches between comfortable and compact layouts
5. Settings page UI to modify preferences
6. TypeScript strict mode compiles without errors
7. Unit tests cover settings store and theme/density changes
8. Error handling dispatches to useErrorStore
9. Integration with existing useUIStore (Story 1-3) or new useSettingsStore
10. Real-time application of settings changes (no reload required)

## Tasks / Subtasks

- [ ] Task 1: Create settings store (AC: #1, #2, #8, #9)
  - [ ] Decide: Extend useUIStore (Story 1-3) or create useSettingsStore
  - [ ] Add theme setting: 'light' | 'dark'
  - [ ] Add density setting: 'comfortable' | 'compact'
  - [ ] Add sidebar width preference (optional)
  - [ ] Configure Zustand persist middleware
  - [ ] Add error dispatch for settings failures
- [ ] Task 2: Implement theme toggle (AC: #3, #10)
  - [ ] Create theme toggle action in store
  - [ ] Apply theme to document.documentElement
  - [ ] Apply theme to document.body
  - [ ] Set color-scheme CSS property
  - [ ] Real-time theme switching
- [ ] Task 3: Implement density toggle (AC: #4, #10)
  - [ ] Create density toggle action in store
  - [ ] Apply density class to app container
  - [ ] Define Tailwind styles for compact density
  - [ ] Real-time density switching
- [ ] Task 4: Create Settings page UI (AC: #5)
  - [ ] Create SettingsPage component
  - [ ] Add theme toggle section
  - [ ] Add density toggle section
  - [ ] Add settings sections layout
  - [ ] Integrate with AppShell inspector or standalone page
- [ ] Task 5: Write unit tests (AC: #6, #7)
  - [ ] Test settings store initialization
  - [ ] Test theme toggle
  - [ ] Test density toggle
  - [ ] Test persistence across reloads
  - [ ] Test real-time application of changes
- [ ] Task 6: Verify TypeScript and integration (AC: #6, #8)
  - [ ] TypeScript strict mode: no errors
  - [ ] Error dispatch to useErrorStore
  - [ ] Integration with Story 1-4 AppShell

## Dev Notes

### Critical Technical Requirements

**Theme Application Pattern**:
```typescript
// Apply theme to HTML and body
const html = document.documentElement;
const body = document.body;
if (theme === 'dark') {
  html.classList.add('dark');
  body.classList.add('dark');
  html.setAttribute('data-theme', 'dark');
  html.style.colorScheme = 'dark';
} else {
  html.classList.remove('dark');
  body.classList.remove('dark');
  html.setAttribute('data-theme', 'light');
  html.style.colorScheme = 'light';
}
```

**Density Classes**:
```typescript
// Comfortable (default): standard Tailwind spacing
// Compact: reduced padding/margins via CSS variables or class
<div className={density === 'compact' ? 'density-compact' : 'density-comfortable'}>
```

### Project Structure Notes

**Store Organization**:
```
src/
├── stores/
│   ├── useUIStore.ts          # Existing (Story 1-3) - extend or keep separate
│   └── useSettingsStore.ts    # New settings store (if separate)
├── features/
│   └── settings/
│       ├── SettingsPage.tsx   # Settings UI
│       └── SettingsPage.test.tsx
```

**Decision: Extend useUIStore vs New Store**:
- **Option A (Extend useUIStore)**: Keep all UI state together, simpler architecture
- **Option B (New useSettingsStore)**: Separate concerns, settings vs transient UI state
- **Recommendation**: Extend useUIStore since theme/density are UI state

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Naming**: `camelCase` for functions, `PascalCase` for components
- **Error Handling**: All errors dispatched to useErrorStore
- **Type Safety**: TypeScript strict mode
- **State Management**: Zustand stores only
- **Styling**: Tailwind CSS utility classes

**Integration with Previous Stories**:
- Story 1-3: useUIStore already has theme field
- Story 1-4: AppShell uses theme from useUIStore
- Story 1-7: Settings could be encrypted (future enhancement)

### Library/Framework Requirements

**Core Dependencies** (already installed):
- `zustand`: Latest stable (persist middleware)
- `tailwindcss`: Latest (theme/density styling)
- `lucide-react`: Icons for settings UI

**DO NOT install**:
- Additional state management libraries

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located: `src/stores/useUIStore.test.ts` (extend existing) or `useSettingsStore.test.ts`
- Test store initialization with defaults
- Test theme toggle action
- Test density toggle action
- Test persistence (mock localStorage)
- Test real-time DOM updates

**Critical Test Scenarios**:
1. ✅ Settings store initializes with defaults
2. ✅ Theme toggle switches between light/dark
3. ✅ Density toggle switches between comfortable/compact
4. ✅ Settings persist across page reload
5. ✅ Theme changes apply to DOM immediately
6. ✅ Density changes apply to DOM immediately

### Git Branch Strategy

**Branch Decision**: Using `allatonce` branch for all epic implementation work.

```bash
git checkout allatonce
```

### Previous Story Intelligence

**From Story 1-3 (Zustand Store Topology)**:
- useUIStore already exists with theme field
- Store uses persist middleware
- Pattern: actions update state, state persists automatically

**From Story 1-4 (Three-Panel Shell Layout)**:
- AppShell already applies theme
- Theme effect in App.tsx updates document classes
- useUIStore integrated into layout

**Code Patterns to Reuse**:
- Store structure from Story 1-3
- Theme application from App.tsx
- Test structure from Story 1-3 stores

### References

- [Source: architecture.md#Frontend Architecture](planning-artifacts/architecture.md)
- [Source: architecture.md#Complete Project Directory Structure](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: epics.md#Epic 1: App Foundation & Core Security](planning-artifacts/epics.md)
- [Source: 1-3-zustand-store-topology.md](implementation-artifacts/1-3-zustand-store-topology.md)
- [Source: 1-4-three-panel-shell-layout.md](implementation-artifacts/1-4-three-panel-shell-layout.md)

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

2. **Extend useUIStore**: Add settings to existing store (Story 1-3) rather than creating new store.

3. **Zustand persist**: Settings MUST persist in localStorage.

4. **Real-time updates**: Theme/density changes MUST apply immediately (no reload).

5. **Error handling**: ALL settings errors MUST dispatch to useErrorStore.

6. **TypeScript strict mode**: ALL code must compile without errors.

7. **Test coverage**: ALL settings actions MUST have unit tests.

8. **Tailwind CSS**: ALL styling MUST use Tailwind utility classes.

### Next Steps

After completing this story:
1. Commit all changes to `allatonce` branch
2. Update sprint-status.yaml and COMMIT
3. Proceed to Story 1.10: GitHub Actions CI/CD Automations
