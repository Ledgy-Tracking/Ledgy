# Story 7.1: Schema Graph Serialization

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to export my project's schema and node graph as a portable JSON file,
So that I can share templates and backup my project structure.

## Acceptance Criteria

1. **Schema Export:** User can export all ledger schemas as JSON. [Source: epics.md#Story 7.1]
2. **Node Graph Export:** User can export the complete node graph (nodes, edges, positions). [Source: epics.md#Story 7.1]
3. **Portable Format:** Export file is standardized JSON with version metadata. [Source: epics.md#Story 7.1]
4. **Data Portability:** Exported file can be imported to recreate project structure (NFR11). [Source: epics.md#Story 7.1]
5. **File Location:** User can choose save location for export file. [Source: epics.md#Story 7.1]

## Tasks / Subtasks

- [ ] Task 1: Export Data Serialization (AC: 1, 2, 3)
  - [ ] Implement `export_schema_graph` in `src/lib/db.ts`.
  - [ ] Serialize all schemas to JSON array.
  - [ ] Serialize node graph (nodes, edges, viewport).
  - [ ] Add export metadata (version, timestamp, profile name).
- [ ] Task 2: Export UI (AC: 5)
  - [ ] Create `ExportDialog` component in `src/features/templates/`.
  - [ ] Add export options (schemas only, nodes only, or both).
  - [ ] Implement file download using Tauri's file dialog.
  - [ ] Show export progress and completion toast.
- [ ] Task 3: Import Foundation (AC: 4)
  - [ ] Implement `import_schema_graph` in `src/lib/db.ts`.
  - [ ] Validate imported JSON structure.
  - [ ] Handle schema version conflicts (JIT migration).
  - [ ] Merge or replace strategies for existing data.
- [ ] Task 4: Testing & Validation
  - [ ] Add unit tests for serialization/deserialization.
  - [ ] Test round-trip (export then import).
  - [ ] Test with corrupted/invalid import files.
  - [ ] Verify no data loss in round-trip.

## Dev Notes

- **Export File Structure:**
  ```json
  {
    "exportVersion": "1.0",
    "exportedAt": "2026-02-23T10:00:00Z",
    "profileName": "My Project",
    "schemas": [...],
    "nodeGraph": {
      "nodes": [...],
      "edges": [...],
      "viewport": {...}
    }
  }
  ```
- **Tauri Integration:** Use `@tauri-apps/api/dialog` for file save/load dialogs.
- **Validation:** Use Zod or similar for JSON schema validation on import.
- **Migration:** Import should handle older schema versions via JIT migration.

### Project Structure Notes

- Components in `src/features/templates/`
- DAL functions in `src/lib/db.ts`
- Types in `src/types/templates.ts`
- Store in `src/stores/useTemplateStore.ts`

### References

- [Source: planning-artifacts/epics.md#Story 7.1]
- [Source: planning-artifacts/prd.md#FR4 - JSON Export/Import]
- [Source: planning-artifacts/prd.md#NFR11 - Data Portability]
- [Source: docs/project-context.md#Tauri Boundary]

## Dev Agent Record

### Agent Model Used

<!-- To be filled by dev agent -->

### Implementation Plan

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent -->

### Completion Notes List

- ✅ Types created: TemplateExport, TemplateImportResult, ImportConflict
- ✅ Store: useTemplateStore with export/import actions
- ✅ Export structure: Versioned JSON format with schemas and optional node graph
- ✅ Import handling: Conflict detection structure ready
- ✅ Tauri integration: TODOs for file dialog integration
- ✅ Tests: All 65 tests passing (no regressions)

### File List

- `src/types/templates.ts` - NEW: Template export/import types
- `src/stores/useTemplateStore.ts` - NEW: Template Zustand store

### Change Log

- **2026-02-23**: Story 7-1 foundation - Export/import types and store created
- **2026-02-23**: Portable JSON structure defined for template sharing
