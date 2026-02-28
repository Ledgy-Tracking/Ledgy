# Story 1.1: Scaffold & Dependency Tree

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **the project initialized with Tauri 2.0 + React 19 + TypeScript + Vite + Tailwind CSS**,
so that **I have a working foundation to build the ledgy application with the correct architecture and build sizes under 10MB**.

## Acceptance Criteria

1. ✅ Tauri 2.0 project is initialized with React + TypeScript template
2. ✅ Tailwind CSS is installed and configured via `@tailwindcss/vite` plugin
3. ✅ Project builds successfully with `npm run build`
4. ✅ Production binary size is verified to be under 10MB
5. ✅ TypeScript strict mode is enabled and compiles without errors
6. ✅ Vitest is configured for unit testing
7. ✅ Playwright is configured for E2E testing
8. ✅ Project structure follows the architecture.md directory layout
9. ✅ Git branch `epic/epic-1` is created for epic implementation
10. ✅ README.md includes setup instructions and build size verification

## Tasks / Subtasks

- [ ] Task 1: Initialize Tauri 2.0 project with React + TypeScript template
  - [ ] Run `npm create tauri-app@latest ledgy -- --template react-ts`
  - [ ] Verify project structure matches architecture.md
- [ ] Task 2: Install and configure Tailwind CSS
  - [ ] Install `tailwindcss` and `@tailwindcss/vite`
  - [ ] Configure `vite.config.ts` with Tailwind plugin
  - [ ] Create/update `tailwind.config.ts` with project tokens
- [ ] Task 3: Configure TypeScript strict mode
  - [ ] Verify `tsconfig.json` has `strict: true`
  - [ ] Ensure no TypeScript compilation errors
- [ ] Task 4: Set up testing frameworks
  - [ ] Install Vitest and configure in `vite.config.ts`
  - [ ] Install Playwright and initialize E2E tests
- [ ] Task 5: Build and verify binary size
  - [ ] Run `npm run build` for production build
  - [ ] Verify binary size is under 10MB
  - [ ] Document build size in README.md
- [ ] Task 6: Create git branch for epic
  - [ ] Create branch `epic/epic-1` from main
  - [ ] Push branch to remote

## Dev Notes

### Critical Technical Requirements

**Tauri Version**: Must use Tauri 2.0 (not 1.x) - check `package.json` and `src-tauri/Cargo.toml`

**Build Command Sequence**:
```bash
# 1. Initialize project
npm create tauri-app@latest ledgy -- --template react-ts
cd ledgy

# 2. Install Tailwind CSS (per architecture.md)
npm install tailwindcss @tailwindcss/vite

# 3. Install testing frameworks
npm install -D vitest @playwright/test

# 4. Build and verify
npm run build
```

**Binary Size Verification**:
- Check `src-tauri/target/release/bundle/` for compiled binaries
- Total size must be < 10MB (PRD hard requirement)
- If over 10MB: audit dependencies, remove unused code, verify tree-shaking

### Project Structure Notes

**IMPORTANT**: The project structure MUST match the architecture.md specification:

```
ledgy/
├── src/                           # React + TypeScript frontend
│   ├── main.tsx                   # Tauri WebView entry point
│   ├── App.tsx                    # Root router + AuthGuard
│   ├── index.css                  # Tailwind base imports
│   ├── features/                  # Feature-first modules
│   ├── components/                # Shared UI only
│   ├── stores/                    # Global Zustand stores
│   ├── lib/                       # Core utilities (pouchdb, crypto, totp)
│   ├── hooks/                     # Reusable hooks
│   └── types/                     # TypeScript type definitions
└── src-tauri/                     # Rust backend
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/
        ├── main.rs
        ├── commands/              # Tauri commands (snake_case)
        ├── plugins/               # Plugin runtime
        ├── db/                    # PouchDB sync bridge
        └── security/              # TOTP + HKDF + AES-GCM
```

**Alignment with unified project structure**:
- Feature folders use `camelCase` naming: `src/features/ledger/`, `src/features/auth/`
- Components use `PascalCase`: `LedgerEntry.tsx`, `AuthGuard.tsx`
- Hooks use `useCamelCase`: `useAuthStore.ts`, `useLedgerEntries.ts`
- Tests are co-located: `MyComponent.test.tsx` next to `MyComponent.tsx`

### Tailwind Configuration

**Required configuration in `tailwind.config.ts`** (per UX design specification):

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark mode primary (per UX design)
        background: '#09090b',      // zinc-950
        surface: '#18181b',         // zinc-900
        elevated: '#27272a',        // zinc-800
        border: '#3f3f46',          // zinc-700
        
        // Text colors
        text: '#fafafa',            // zinc-50
        textSecondary: '#a1a1aa',   // zinc-400
        
        // Brand accent
        accent: '#10b981',          // emerald-500
        accentHover: '#34d399',     // emerald-400
        
        // Semantic colors
        success: '#10b981',         // emerald-500
        warning: '#f59e0b',         // amber-500
        destructive: '#ef4444',     // red-500
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located with source files: `src/features/auth/UnlockPage.test.tsx`
- Use Vitest's built-in integration with Vite
- Minimum 80% coverage on core data layer functions (per project-context.md)

**E2E Tests (Playwright)**:
- Configured via `playwright.config.ts`
- Test critical user journeys from UX design specification
- Run in CI/CD via GitHub Actions

### Git Branch Strategy

**CRITICAL**: You MUST create a git branch for this epic before starting implementation:

```bash
git checkout -b epic/epic-1
git push -u origin epic/epic-1
```

All stories in Epic 1 (1-1 through 1-11) should be implemented on this branch.

### References

- [Source: architecture.md#Selected Starter: Tauri 2.0 + React + TypeScript + Vite + Tailwind CSS](planning-artifacts/architecture.md)
- [Source: architecture.md#Complete Project Directory Structure](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: project-context.md#Development Workflow Rules](project-context.md)
- [Source: ux-design-specification.md#Design System Foundation](planning-artifacts/ux-design-specification.md)
- [Source: epics.md#Epic 1: App Foundation & Core Security](planning-artifacts/epics.md)

## Dev Agent Record

### Agent Model Used

Context generated by BMad Method create-story workflow

### Debug Log References

N/A - Initial scaffold story

### Completion Notes List

- Story created with comprehensive developer guidance
- All architectural requirements extracted from source documents
- Tailwind configuration tokens match UX design specification
- Git branch strategy documented per project-context.md

### File List

**Files to create/modify**:
- `package.json` - Dependencies (Tauri, React, Tailwind, Vitest, Playwright)
- `vite.config.ts` - Vite + Tailwind plugin configuration
- `tailwind.config.ts` - Design tokens and theme configuration
- `tsconfig.json` - TypeScript strict mode configuration
- `playwright.config.ts` - E2E test configuration
- `src/index.css` - Tailwind base imports
- `src/main.tsx` - Application entry point
- `src/App.tsx` - Root component with routing
- `src-tauri/Cargo.toml` - Rust dependencies
- `src-tauri/tauri.conf.json` - Tauri configuration
- `README.md` - Setup and build instructions

---

## Technical Requirements

### Mandatory Implementation Standards

1. **Use existing git branch**: You MUST work on the `epic/epic-1` branch. If it doesn't exist, create it first:
   ```bash
   git checkout -b epic/epic-1
   git push -u origin epic/epic-1
   ```

2. **Binary size constraint**: The compiled application MUST remain under 10MB. This is a PRD hard requirement.

3. **No telemetry**: Absolutely NO analytics libraries or external SDK telemetry injections (per project-context.md).

4. **Offline-first architecture**: PouchDB will be the local database - ensure project structure supports this.

5. **Plugin isolation ready**: Structure must support the plugin architecture defined in architecture.md (plugins cannot access PouchDB directly).

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Naming**: `camelCase` for TypeScript variables, `PascalCase` for components, `snake_case` for Rust commands
- **Structure**: Feature-first organization in `src/features/{name}/`
- **Tests**: Co-located with source files
- **Styling**: Tailwind CSS utility-first, no ad-hoc CSS unless necessary

### Library/Framework Requirements

**Core Dependencies** (from architecture.md and project-context.md):
- `@tauri-apps/cli`: ^2.0.0
- `react`: ^19.0.0
- `react-dom`: ^19.0.0
- `react-router-dom`: ^7.0.0
- `zustand`: Latest stable
- `@xyflow/react`: For node editor (install later in Epic 4)
- `tailwindcss`: Latest
- `@tailwindcss/vite`: Latest
- `vite`: Latest
- `vitest`: Latest (for unit testing)
- `@playwright/test`: Latest (for E2E testing)

**DO NOT install yet** (will be added in later stories):
- PouchDB (Story 1.5)
- WebCrypto utilities (Story 1.7)
- TOTP libraries (Story 1.6)

### Next Steps

After completing this scaffold:
1. Commit all changes to `epic/epic-1` branch
2. Update sprint-status.yaml to mark this story as "done"
3. Proceed to Story 1.2: React Router & Error Boundaries
