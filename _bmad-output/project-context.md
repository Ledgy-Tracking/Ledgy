---
project_name: 'ledgy'
user_name: 'James'
date: '2026-02-21T14:52:00+08:00'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 23
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Core Application**: Tauri 2.0 with Rust backend
- **Frontend Framework**: React 19
- **Language**: TypeScript (in strict mode)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Node Editor UI**: React Flow (`@xyflow/react`)
- **Routing**: React Router v7
- **Database / Sync**: PouchDB
- **Build Tool**: Vite

## Critical Implementation Rules

### Language-Specific Rules

- **TypeScript Configuration**: Strict mode is strictly enforced.
- **Naming Conventions**:
  - `camelCase`: All TypeScript variables, object properties, PouchDB field names, and React Hooks.
  - `PascalCase`: All React Components and file exports.
  - `snake_case`: Tauri Rust commands and event names.
- **Date Formatting**: Always use ISO 8601 strings with timezone offset. Never use Unix timestamps in document fields.

### Framework-Specific Rules

- **Zustand State Management**: Global stores own specific domains (e.g., Profile, Ledger). Each store must maintain its own `isLoading` and `error` attributes.
- **React Components**: Do not use local `useState` for async loading or error handling. Offload to the respective Zustand store.
- **Tauri Boundary**: No frontend code should interact with OS primitives directly. Always use wrappers using Tauri's `invoke()`.
- **Rust `invoke()` Responses**: Rust backend operations return `Result<T, String>`. Frontend `invoke()` execution must be wrapped in `try/catch`. 
- **Error Routing**: Errors caught in `invoke()` must be dispatched to the global `useErrorStore` to be formatted into an `<ErrorToast />`.
- **Auth Guarding**: Wrap all main application interfaces in `<AuthGuard />` to check for TOTP unlock state except setup and initial unlock routes.
- **PouchDB Models**: 
  - Required envelope fields: `_id` (must follow `{type}:{uuid}`), `_type`, `schema_version`, `createdAt`, `updatedAt`.
  - Delete operations should prefer "Ghost References" (soft delete with `isDeleted` flag and/or `deletedAt`) to maintain relational integrity.

### Testing Rules

- **Test Co-location**: Unit tests must be co-located with the source file they test (`{filename}.test.tsx` next to `{filename}.tsx`). 
- **Unit Testing Framework**: Use Vitest for all unit testing purposes (it is tightly coupled with Vite).
- **E2E Framework**: Use Playwright for End-to-End browser UI tests.

### Code Quality & Style Rules

- **Styling Strategy**: Apply utility-first styling strictly through Tailwind CSS; restrict writing ad-hoc CSS unless strictly necessary.
- **Feature Encapsulation Structure**: Architect logic in self-contained module blocks. A feature folder (`src/features/{name}/`) should contain the Component, its custom Hook, and its local Zustand Store Slice logic, along with co-located tests.
- **Shared Code Layout**: Shared UI components must reside in `src/components/`. Reusable cross-feature logic belongs in `src/hooks/` or `src/lib/`.

### Development Workflow Rules

- **Branch Creation**: When starting work on an epic, you MUST create a new git branch for that epic (e.g., `epic/epic-{{epic_num}}`). Multiple stories within the same epic should be implemented and committed to this epic branch. Do not implement directly on the main continuous integration branch.
- **Story Completion**: When a story is set to done and successfully committed, you MUST perform a `git push` and create a Pull Request from the story branch to the main branch.
- **Sprint Status Commits**: When a sprint status is changed (for example, in `sprint-status.yaml`), you MUST always perform a git commit. Furthermore, you must ALWAYS require user review of the commit message before committing.
- **CI/CD Build Systems**: GitHub actions will be used to automatically compile cross-platform versions (Win/Mac/Linux).
- **Binary Size Limits**: Do not bundle runtime engines that exponentially increase payload (e.g., Heavy AI/Gemini-nano models). The compiled application must remain under 10MB. Distribution runs through Tauri's built-in updater using GitHub Releases.

### Critical Don't-Miss Rules

- **Plugin Data Isolation**: Do NOT allow Plugins (in `src/plugins/` or `src-tauri/src/plugins/`) to ever bypass Core interactions and natively access PouchDB. All read/write IO originates through core ledger `invoke()` operations.
- **0 Telemetry & Network Ping Rule**: Avoid all external SDK telemetry injections; absolutely NO analytics libraries.
- **Offline Sync Behaviors**: Local overrides Remote. PouchDB must survive network cuts and resume CouchDB syncing efficiently. Conflicts default to Last-Write-Wins (LWW).
- **Secure Handling of Secrets/Tokens**: Encryption uses AES-256-GCM client-side. Key derivation depends heavily on the TOTP (RFC 6238) generation (HKDF derived Key) via Google Authenticator logic without ever using Email/Password authentication patterns or persisting arbitrary DB access variables.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-02-21
