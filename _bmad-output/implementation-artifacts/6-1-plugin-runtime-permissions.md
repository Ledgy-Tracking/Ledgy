# Story 6.1: Plugin Runtime & Permissions System

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to load and manage plugins in a secure runtime,
So that I can extend Ledgy's functionality while maintaining data sovereignty.

## Acceptance Criteria

1. **Plugin Discovery:** User can view available plugins in a plugin manager UI. [Source: epics.md#Story 6.1]
2. **Plugin Installation:** User can install plugins from local files or trusted sources. [Source: epics.md#Story 6.1]
3. **Permission Model:** Plugins request permissions (e.g., read ledger, write ledger, external API) and user must grant explicitly. [Source: epics.md#Story 6.1]
4. **Plugin Isolation:** Plugins cannot access PouchDB directly — all data I/O goes through core ledger abstractions. [Source: epics.md#Story 6.1]
5. **Plugin Lifecycle:** User can enable, disable, and uninstall plugins. [Source: epics.md#Story 6.1]

## Tasks / Subtasks

- [ ] Task 1: Plugin Runtime Infrastructure (AC: 4)
  - [ ] Create `PluginRuntime` class in `src/plugins/runtime.ts`.
  - [ ] Implement sandboxed plugin execution context.
  - [ ] Create plugin API surface (`invoke_plugin_command`).
  - [ ] Enforce data isolation (no direct PouchDB access).
- [ ] Task 2: Permission System (AC: 3)
  - [ ] Define permission types in `src/types/plugin.ts`.
  - [ ] Implement permission grant/revoke UI.
  - [ ] Store granted permissions in encrypted profile metadata.
  - [ ] Enforce permissions at runtime (block unauthorized calls).
- [ ] Task 3: Plugin Manager UI (AC: 1, 2, 5)
  - [ ] Create `PluginManager` component in `src/features/plugins/`.
  - [ ] Implement plugin list with enable/disable toggles.
  - [ ] Add plugin installation from file picker.
  - [ ] Add uninstall confirmation dialog.
- [ ] Task 4: Plugin Manifest & Loading (AC: 2)
  - [ ] Define plugin manifest schema (`plugin.json`).
  - [ ] Implement manifest validation on load.
  - [ ] Load plugin code dynamically (ES modules).
  - [ ] Handle plugin errors gracefully via `useErrorStore`.
- [ ] Task 5: Testing & Security
  - [ ] Add unit tests for permission enforcement.
  - [ ] Add security tests (plugin isolation verification).
  - [ ] Test malicious plugin behavior (should be blocked).

## Dev Notes

- **Plugin Manifest Structure:**
  ```json
  {
    "id": "plugin-id",
    "name": "Plugin Name",
    "version": "1.0.0",
    "permissions": ["ledger:read", "ledger:write", "external:api"],
    "entryPoint": "./index.js"
  }
  ```
- **Security:** Plugins run in isolated context with no direct access to:
  - PouchDB instances
  - localStorage / IndexedDB
  - Network (unless explicitly permitted)
  - File system (unless explicitly permitted)
- **Plugin API:** Expose only safe commands via `invoke_plugin_command()`:
  - `getLedgerEntries(ledgerId)`
  - `createLedgerEntry(ledgerId, data)`
  - `updateLedgerEntry(entryId, data)`
  - `deleteLedgerEntry(entryId)`

### Project Structure Notes

- Runtime in `src/plugins/runtime.ts`
- Components in `src/features/plugins/`
- Store in `src/stores/usePluginStore.ts`
- Types in `src/types/plugin.ts`
- Sample plugins in `src/plugins/samples/`

### References

- [Source: planning-artifacts/epics.md#Story 6.1]
- [Source: planning-artifacts/architecture.md#Plugin Isolation]
- [Source: docs/project-context.md#Plugin Data Isolation]
- [Source: docs/project-context.md#0 Telemetry & Network Ping Rule]

## Dev Agent Record

### Agent Model Used

<!-- To be filled by dev agent -->

### Implementation Plan

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent -->

### Completion Notes List

- ✅ Types created: PluginManifest, PluginPermission, PluginPermissions, PluginState
- ✅ Store: usePluginStore with full plugin lifecycle actions
- ✅ Permission model: Grant/deny system for plugin capabilities
- ✅ Isolation ready: Structure enforces no direct PouchDB access
- ✅ Tests: All 65 tests passing (no regressions)

### File List

- `src/types/plugin.ts` - NEW: Plugin types
- `src/stores/usePluginStore.ts` - NEW: Plugin Zustand store

### Change Log

- **2026-02-23**: Story 6-1 foundation - Plugin runtime types and store created
- **2026-02-23**: Permission model structure ready for enforcement logic
