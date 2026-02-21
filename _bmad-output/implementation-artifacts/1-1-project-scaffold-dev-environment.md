# Story 1.1: Project Scaffold & Dev Environment

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to initialize the Tauri + React + TypeScript + Vite + Tailwind CSS project from the official starter,
so that the entire team starts from a verified, buildable baseline with consistent tooling.

## Acceptance Criteria

1. **Given** a clean working directory
   **When** the developer runs `npm create tauri-app@latest ledgy -- --template react-ts` then installs `tailwindcss @tailwindcss/vite`
   **Then** the app compiles and launches as a native Tauri window on Windows, macOS, and Linux
2. **And** Vitest and Playwright are configured and a sample test passes
3. **And** the installation package size is verified to be under 10MB

## Tasks / Subtasks

- [x] Task 1 (AC: 1): Initialize the project repository
  - [x] Subtask 1.1: Run Tauri starter `npm create tauri-app@latest . -- --template react-ts` (inside current directory without wiping existing docs folder)
  - [x] Subtask 1.2: Install Tailwind CSS (`npm install tailwindcss @tailwindcss/vite`) and configure `vite.config.ts`, `tailwind.config.ts`, and `src/index.css`
  - [x] Subtask 1.3: Initialize basic directory structure (e.g., `src/features`, `src/components`, `src/lib`, `src/stores`, `src/types`) per architecture specification.
- [x] Task 2 (AC: 2): Configure Development and Testing frameworks
  - [x] Subtask 2.1: Add `vitest` to project for unit testing and add a sample passing test
  - [x] Subtask 2.2: Add `playwright` for E2E testing and add a sample passing test
- [x] Task 3 (AC: 3): Validate Desktop App Compilation and boundaries
  - [x] Subtask 3.1: Build native application for local OS (via `npm run tauri build` or similar)
  - [x] Subtask 3.2: Verify the installation size is < 10MB (or log current size)

## Dev Notes

### Technical Requirements
- **Language/Framework**: React 19 + TypeScript (strict mode) + Vite.
- **Backend Bridge**: Tauri 2.0 (Rust backend).
- **Styling**: Tailwind CSS utility-first layout. No CSS-in-JS.
- **Performance**: Must remain under 10MB for installation package.
- **Design System tokens**: `zinc-950` base, `zinc-900` surface, `emerald-500` brand accent. Font `Inter` for body.

### Architecture Compliance
- **Tauri Commands**: All backend logic must use `#[tauri::command]` in Rust.
- **Filesystem Access**: Must use `invoke()` for any OS operations rather than direct access from React. 
- **Tests Location**: Co-locate unit tests with source (e.g., `MyComponent.test.tsx` next to `MyComponent.tsx`).

### Library & Framework Requirements
- Ensure we install `@tailwindcss/vite` for Vite 5+ plugin compatibility.
- Ensure strict TypeScript (`"strict": true` in `tsconfig.json`).

### File Structure Requirements
Scaffold the `src/` folder explicitly as:
```text
src/
├── main.tsx
├── App.tsx
├── index.css
├── features/
├── plugins/
├── components/
├── stores/
├── lib/
├── hooks/
└── types/
```

### Testing Requirements
- **Vitest**: Create basic configuration in `vite.config.ts`.
- **Sample Test**: Add `src/App.test.tsx` verifying the App renders.
- **Playwright**: Minimal config to ensure E2E is ready.

### Project Structure Notes
- **Alignment with unified project structure (paths, modules, naming)**:
  - Setup `src/` React layout and `src-tauri` folder gracefully using the starter template.
- **Detected conflicts or variances (with rationale)**:
  - We are scaffolding in an existing repo with docs/bmad. We must adapt `npm create tauri-app` to run into the root directory instead of a subfolder, taking care not to overwrite existing BMAD documentation.

### References
- [Source: planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: planning-artifacts/architecture.md#Complete Project Directory Structure]
- [Source: planning-artifacts/epics.md#Story 1.1: Project Scaffold & Dev Environment]

## Dev Agent Record

### Agent Model Used
Gemini 3.1 Pro

### Debug Log References
- Cargo was used to natively build the desktop bundles.
- Footprint Validated: The `.msi` is ~2.8MB and `.exe` setup is ~1.8MB, satisfying the < 10MB requirement.
- Excluded tests folder from vitest properly since playwright specs exist there.

### Completion Notes List
- Successfully scaffolded Tauri React TS app without wiping existing project files.
- Completed TailwindCSS v4 setup with Vite config.
- Installed Vitest + JSDOM and authored sample passing test checking the App's heading.
- Initialized Playwright in `tests/example.spec.ts`.
- Set up directories: src/features, src/plugins, src/components, src/stores, src/lib, src/hooks, src/types.
- Native build compilation ran successfully and verified the footprint sizes (< 10MB).

### File List
- `package.json`
- `vite.config.ts`
- `src/index.css`
- `src/main.tsx`
- `src/App.test.tsx`
- `src/setupTests.ts`
- `src/vite-env.d.ts`
- `tests/example.spec.ts`
- `src-tauri/tauri.conf.json`
