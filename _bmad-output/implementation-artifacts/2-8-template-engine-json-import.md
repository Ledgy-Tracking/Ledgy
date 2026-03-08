# Story 2.8: Template Engine (JSON Import)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Ledgy user who has received a `.ledgy.json` template from a collaborator or from their own previous export**,
I want **to import that template file into an existing profile in the Dashboard**,
so that **I can scaffold a fresh profile with pre-built schema structures and node graph layout without manually recreating them.**

## Acceptance Criteria

1. An **Import Template** button is visible in the Dashboard toolbar at all times (not gated on `hasLedgers`), positioned beside the **Export Template** button.
2. Clicking **Import Template** in the **browser environment** opens a file picker (`<input type="file" accept=".json,.ledgy.json">`) allowing the user to select a `.ledgy.json` file.
3. Clicking **Import Template** in the **Tauri desktop environment** opens a native OS Open dialog filtered to `.json` / `.ledgy.json` files.
4. If the user cancels the file picker or Tauri dialog, the import silently aborts with no error shown and `isImporting` remains `false`.
5. After the file is read, the system validates the JSON structure against the `TemplateExport` shape (`exportVersion`, `schemas` array, each schema having `name` and `fields`). If validation fails, `useErrorStore.dispatchError()` is called with a descriptive message and no schemas are written.
6. For each valid schema in the template, the system calls `create_schema(db, schema.name, schema.fields, profileId, projectId)` on the current profile's DB. **No ledger entries are imported — schema metadata only.**
7. If the template includes a `nodeGraph`, the system calls `save_canvas(db, 'default', nodes, edges, viewport, profileId)` to restore the node graph layout.
8. If a schema with the same `name` already exists in the target project, it is **skipped** (not overwritten), recorded in `TemplateImportResult.conflicts`, and import continues for remaining schemas.
9. After a successful import (at least one schema created), the user receives a **success notification** via `useNotificationStore.getState().addNotification('Template imported successfully', 'success')`.
10. If any schema creation throws (non-conflict), the error is recorded in `TemplateImportResult.errors` but processing **continues** for remaining schemas (best-effort import). Errors are dispatched individually via `useErrorStore.dispatchError()`.
11. The `useTemplateStore.importTemplate()` signature is updated to accept `(template: TemplateExport, profileId: string, projectId: string)` to include the target project context.
12. During import, `isImporting` is `true`; the **Import Template** button is disabled. After completion (success or error), `isImporting` resets to `false`.
13. **CRITICAL**: Developer MUST use the existing `main` git branch for this epic.

## Tasks / Subtasks

- [ ] Task 1: Create `src/lib/templateImport.ts` — the core import pipeline (AC: #5, #6, #7, #8, #10)
  - [ ] 1.1: Implement `validate_template(data: unknown): data is TemplateExport` — check `exportVersion === '1.0'`, `schemas` is a non-empty array, each schema has a non-empty `name` string and `fields` array.
  - [ ] 1.2: Implement `import_template(db, template, profileId, projectId): Promise<TemplateImportResult>` — iterate `template.schemas`, call `create_schema` for each non-conflicting schema, call `save_canvas` if `template.nodeGraph` exists, collect results.
  - [ ] 1.3: Implement conflict detection inside `import_template` — call `list_schemas(db)` once before the loop, build a name-set, skip any schema whose name matches; push an `ImportConflict` of type `'schema_exists'`.
  - [ ] 1.4: Implement `readTemplateBrowser(): Promise<TemplateExport | null>` — create hidden `<input type="file" accept=".json,.ledgy.json">`, click it programmatically, await `FileReader` result, `JSON.parse`, return parsed data or `null` if cancelled.
  - [ ] 1.5: Implement `readTemplateTauri(): Promise<TemplateExport | null>` — use `Function()` constructor pattern (mirror of `saveTemplateTauri`) to dynamically import `@tauri-apps/api/dialog` open() and `@tauri-apps/api/fs` readTextFile(), return parsed JSON or `null` if cancelled.

- [ ] Task 2: Update `useTemplateStore.importTemplate()` — wire real implementation (AC: #9, #10, #11, #12)
  - [ ] 2.1: Update the `TemplateState` interface: change signature from `importTemplate(template, profileId)` to `importTemplate(template: TemplateExport, profileId: string, projectId: string): Promise<TemplateImportResult>`.
  - [ ] 2.2: In the store implementation, replace the stub body with: get `db` via `getProfileDb(profileId)`, call `import_template(db, template, profileId, projectId)` from `../lib/templateImport`, call `useNotificationStore.getState().addNotification('Template imported successfully', 'success')` on success.
  - [ ] 2.3: On any thrown error, call `useErrorStore.getState().dispatchError(errorMsg)` and rethrow (same pattern as `exportTemplate`).

- [ ] Task 3: Create `src/features/templates/ImportTemplateButton.tsx` (AC: #1, #2, #3, #4, #12)
  - [ ] 3.1: Component accepts `profileId: string` and `projectId: string` as props.
  - [ ] 3.2: On click, call `readTemplateTauri()` if `isTauri()`, else call `readTemplateBrowser()`. If result is `null` (cancel), return silently.
  - [ ] 3.3: Validate the parsed data with `validate_template()`. If invalid, call `useErrorStore.getState().dispatchError('Invalid template file: …')` and return.
  - [ ] 3.4: Call `importTemplate(parsedTemplate, profileId, projectId)` from `useTemplateStore`. Button is `disabled={isImporting}` during operation.
  - [ ] 3.5: Mirror `ExportTemplateButton.tsx` styling exactly (zinc-800 bg, zinc-300 text, disabled state, `aria-label="Import template"`). Use `Upload` icon from `lucide-react`.

- [ ] Task 4: Wire `ImportTemplateButton` into `Dashboard.tsx` (AC: #1)
  - [ ] 4.1: Import `ImportTemplateButton` from `'../templates/ImportTemplateButton'`.
  - [ ] 4.2: In the toolbar `<div className="flex items-center gap-2">`, render `<ImportTemplateButton profileId={profileId!} projectId={projectId!} />` beside `<ExportTemplateButton />`. `ImportTemplateButton` is shown unconditionally (not inside the `{hasLedgers && ...}` guard).

- [ ] Task 5: Write `src/lib/templateImport.test.ts` — unit tests (AC: #5, #6, #7, #8, #10)
  - [ ] 5.1: Test `validate_template` — valid `TemplateExport` passes; missing `schemas` field fails; `exportVersion !== '1.0'` fails; `schemas` with missing `name` fails.
  - [ ] 5.2: Test `import_template` success (schemas only) — mock `list_schemas` returning `[]`, mock `create_schema` returning `'schema:abc'`, assert `importedSchemas === 1`, `conflicts === []`, `errors === []`.
  - [ ] 5.3: Test `import_template` success (schemas + nodeGraph) — mock `save_canvas`, assert `importedNodes > 0`.
  - [ ] 5.4: Test `import_template` conflict detection — mock `list_schemas` returning a schema with same name as template schema, assert `importedSchemas === 0`, `conflicts` has one entry with `type: 'schema_exists'`.
  - [ ] 5.5: Test `import_template` error path — mock `create_schema` throwing, assert `errors` has one entry and function still returns (no rethrow from `import_template` itself).

- [ ] Task 6: Extend `src/stores/useTemplateStore.test.ts` — add import-path tests (AC: #9, #11, #12)
  - [ ] 6.1: Test `importTemplate` success: mock `import_template` resolving with `{ success: true, importedSchemas: 2, importedNodes: 0, conflicts: [], errors: [] }`, assert `addNotification` called with `'success'`, `isImporting` resets to `false`.
  - [ ] 6.2: Test `importTemplate` error: mock `import_template` throwing, assert `dispatchError` called, `isImporting` resets to `false`.

## Dev Notes

### Critical: What Is Already Implemented

> **DO NOT re-implement the export pipeline.** Story 2.7 delivered the complete export flow. Your job is to build the **parallel import pipeline**.

The following are **already implemented and tested**:
- `src/lib/templateExport.ts` — `export_template`, `generateTemplateFilename`, `downloadTemplateBrowser`, `saveTemplateTauri`, `isTauri`
- `src/stores/useTemplateStore.ts` — `exportTemplate` (complete), `importTemplate` (stub — your Task 2), `reset()`, `initialState`
- `src/stores/useTemplateStore.test.ts` — 5 tests for export path (DO NOT break these)
- `src/features/templates/ExportTemplateButton.tsx` — fully styled and wired
- `src/features/dashboard/Dashboard.tsx` — toolbar with `ExportTemplateButton` (add `ImportTemplateButton` beside it)
- `src/types/templates.ts` — `TemplateExport`, `TemplateImportResult`, `ImportConflict` (ready to use, do NOT modify)

The following are **already available in `src/lib/db.ts`**:
- `create_schema(db, name, fields, profileId, projectId, encryptionKey?)` — use without `encryptionKey` for template import
- `list_schemas(db)` — use for conflict detection
- `save_canvas(db, canvasId, nodes, edges, viewport, profileId, encryptionKey?)` — use `'default'` as `canvasId`, no `encryptionKey`
- `getProfileDb(profileId)` — already imported in `useTemplateStore`

### What Is Missing (Your Work)

1. **`src/lib/templateImport.ts`** — the entire import library (Task 1)
2. **`importTemplate` store implementation** — stub body needs replacing (Task 2)
3. **`src/features/templates/ImportTemplateButton.tsx`** — new UI component (Task 3)
4. **`Dashboard.tsx` toolbar** — add `<ImportTemplateButton />` (Task 4)
5. **`src/lib/templateImport.test.ts`** — new test file (Task 5)
6. **`src/stores/useTemplateStore.test.ts`** additions — import-path tests (Task 6)

### Architecture Compliance

- **File locations**: `src/lib/templateImport.ts` (utility), `src/features/templates/ImportTemplateButton.tsx` (FR16 component) — correct per architecture FR to Directory Mapping.
- **Naming**: `import_template` (utility function snake_case), `validate_template` (snake_case utility), `ImportTemplateButton` (PascalCase component), `readTemplateBrowser`/`readTemplateTauri` (camelCase utilities).
- **Error handling**: Errors → `useErrorStore.getState().dispatchError(msg)` — **never** local `useState`.
- **Loading state**: `isImporting` lives in `useTemplateStore` — **never** local component state.
- **Tauri pattern**: Use `Function()` constructor (same as `saveTemplateTauri`) to avoid Vite static analysis. Copy that exact pattern.
- **No encryption on import**: Template files carry plaintext schema names/fields. `create_schema` and `save_canvas` are called **without** `encryptionKey`. This is correct — encryption is applied on the fly by the DB layer when the user session is active.
- **Branch**: Use `main` branch (confirmed active for Epic 2).

### `importTemplate` Stub → Full Implementation

Current stub in `useTemplateStore.ts` (lines ~55–75 approx):
```typescript
importTemplate: async (_template: TemplateExport, _profileId: string) => {
    set({ isImporting: true, error: null });
    try {
        // TODO: Implement import_schema_graph in db.ts
        // TODO: Validate template structure
        // TODO: Handle conflicts (skip/overwrite/merge)
        const result: TemplateImportResult = {
            success: true,
            importedSchemas: 0,
            importedNodes: 0,
            conflicts: [],
            errors: [],
        };
        set({ isImporting: false });
        return result;
    } catch (err: any) {
        const errorMsg = err.message || 'Failed to import template';
        set({ error: errorMsg, isImporting: false });
        useErrorStore.getState().dispatchError(errorMsg);
        throw err;
    }
},
```

Replace with (after updating the `TemplateState` interface signature too):
```typescript
importTemplate: async (template: TemplateExport, profileId: string, projectId: string) => {
    set({ isImporting: true, error: null });
    try {
        const db = getProfileDb(profileId);
        const result = await import_template(db, template, profileId, projectId);
        useNotificationStore.getState().addNotification('Template imported successfully', 'success');
        set({ isImporting: false });
        return result;
    } catch (err: any) {
        const errorMsg = err.message || 'Failed to import template';
        set({ error: errorMsg, isImporting: false });
        useErrorStore.getState().dispatchError(errorMsg);
        throw err;
    }
},
```

Add import at the top of `useTemplateStore.ts`:
```typescript
import { import_template } from '../lib/templateImport';
```

### `templateImport.ts` Core Pattern

```typescript
import { Database, create_schema, list_schemas, save_canvas } from './db';
import { TemplateExport, TemplateImportResult, ImportConflict } from '../types/templates';

export function validate_template(data: unknown): data is TemplateExport {
    if (typeof data !== 'object' || data === null) return false;
    const d = data as any;
    if (d.exportVersion !== '1.0') return false;
    if (!Array.isArray(d.schemas)) return false;
    for (const s of d.schemas) {
        if (typeof s.name !== 'string' || !s.name.trim()) return false;
        if (!Array.isArray(s.fields)) return false;
    }
    return true;
}

export async function import_template(
    db: Database,
    template: TemplateExport,
    profileId: string,
    projectId: string
): Promise<TemplateImportResult> {
    const conflicts: ImportConflict[] = [];
    const errors: string[] = [];
    let importedSchemas = 0;
    let importedNodes = 0;

    // Conflict detection: get existing schema names once
    const existingSchemas = await list_schemas(db);
    const existingNames = new Set(existingSchemas.map(s => s.name));

    for (const schema of template.schemas) {
        if (existingNames.has(schema.name)) {
            conflicts.push({ type: 'schema_exists', itemId: schema.name, resolution: 'skip' });
            continue;
        }
        try {
            await create_schema(db, schema.name, schema.fields, profileId, projectId);
            importedSchemas++;
        } catch (e: any) {
            errors.push(`Failed to import schema "${schema.name}": ${e.message}`);
        }
    }

    if (template.nodeGraph) {
        try {
            await save_canvas(db, 'default', template.nodeGraph.nodes, template.nodeGraph.edges, template.nodeGraph.viewport, profileId);
            importedNodes = template.nodeGraph.nodes.length;
        } catch (e: any) {
            errors.push(`Failed to import node graph: ${e.message}`);
        }
    }

    return {
        success: errors.length === 0,
        importedSchemas,
        importedNodes,
        conflicts,
        errors,
    };
}
```

### `readTemplateTauri` Pattern (mirror of `saveTemplateTauri`)

```typescript
export async function readTemplateTauri(): Promise<TemplateExport | null> {
    try {
        const importTauriDialog = new Function('return import("@tauri-apps/api/dialog")') as () => Promise<any>;
        const importTauriFs = new Function('return import("@tauri-apps/api/fs")') as () => Promise<any>;

        const dialogModule = await importTauriDialog();
        const fsModule = await importTauriFs();

        const filePath = await dialogModule.open({
            filters: [{ name: 'Ledgy Template', extensions: ['json', 'ledgy.json'] }],
            multiple: false,
        });

        if (!filePath) return null; // User cancelled

        const content = await fsModule.readTextFile(filePath as string);
        return JSON.parse(content) as TemplateExport;
    } catch (e: any) {
        console.error('Tauri read failed:', e);
        throw new Error('Failed to read template file');
    }
}
```

### `readTemplateBrowser` Pattern

```typescript
export function readTemplateBrowser(): Promise<TemplateExport | null> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.ledgy.json';

        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) { resolve(null); return; }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    resolve(JSON.parse(e.target?.result as string));
                } catch {
                    reject(new Error('Invalid JSON in template file'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read template file'));
            reader.readAsText(file);
        };

        input.oncancel = () => resolve(null);

        // Some browsers don't fire oncancel — handle via focus
        input.click();
    });
}
```

### `ImportTemplateButton` Pattern (mirror of `ExportTemplateButton`)

```typescript
import React from 'react';
import { Upload } from 'lucide-react';
import { useTemplateStore } from '../../stores/useTemplateStore';
import { useErrorStore } from '../../stores/useErrorStore';
import { isTauri, readTemplateBrowser, readTemplateTauri, validate_template } from '../../lib/templateImport';

interface ImportTemplateButtonProps {
    profileId: string;
    projectId: string;
}

export const ImportTemplateButton: React.FC<ImportTemplateButtonProps> = ({ profileId, projectId }) => {
    const { importTemplate, isImporting } = useTemplateStore();
    const { dispatchError } = useErrorStore();

    const handleImport = async () => {
        try {
            const raw = isTauri() ? await readTemplateTauri() : await readTemplateBrowser();
            if (!raw) return; // cancelled
            if (!validate_template(raw)) {
                dispatchError('Invalid template file: missing or malformed fields');
                return;
            }
            await importTemplate(raw, profileId, projectId);
        } catch (err: any) {
            dispatchError(err.message || 'Import failed');
        }
    };

    return (
        <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-zinc-300 rounded transition-colors disabled:cursor-not-allowed"
            title="Import template from .ledgy.json file"
            aria-label="Import template"
        >
            <Upload size={16} />
            <span>Import</span>
            {isImporting && (
                <span className="ml-1 text-xs text-zinc-500">...</span>
            )}
        </button>
    );
};
```

### `Dashboard.tsx` Toolbar Change

Find in `Dashboard.tsx`:
```tsx
<div className="flex items-center gap-2">
    {hasLedgers && <ExportTemplateButton />}
```

Change to:
```tsx
<div className="flex items-center gap-2">
    <ImportTemplateButton profileId={profileId!} projectId={projectId!} />
    {hasLedgers && <ExportTemplateButton />}
```

Also add the import at the top:
```typescript
import { ImportTemplateButton } from '../templates/ImportTemplateButton';
```

### Key Imports for `templateImport.ts`

Note that `isTauri` is also needed in `ImportTemplateButton.tsx`. Two options:
- Re-export `isTauri` from `templateImport.ts` (import from same place)
- Or import it from `templateExport.ts` directly

**Recommended**: re-export `isTauri` from `src/lib/templateImport.ts` by re-exporting from `templateExport.ts`:
```typescript
export { isTauri } from './templateExport';
```
This keeps `ImportTemplateButton` importing only from `templateImport`.

### Test Mocking Pattern for `templateImport.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validate_template, import_template } from './templateImport';

vi.mock('./db', () => ({
    create_schema: vi.fn().mockResolvedValue('schema:test-id'),
    list_schemas: vi.fn().mockResolvedValue([]),
    save_canvas: vi.fn().mockResolvedValue('canvas:default'),
}));
```

### Test Mocking Pattern for `useTemplateStore.test.ts` additions

```typescript
vi.mock('../lib/templateImport', () => ({
    import_template: vi.fn(),
}));
```

Add to existing mock block; do NOT replace the existing `templateExport` mock.

### Project Structure Notes

- `src/lib/templateImport.ts` — NEW file (do not place in `features/`; utilities belong in `lib/`)
- `src/lib/templateImport.test.ts` — NEW, co-located with source per architecture convention
- `src/features/templates/ImportTemplateButton.tsx` — NEW, in correct FR16 directory
- `src/features/dashboard/Dashboard.tsx` — MODIFIED (2 lines: import + render)
- `src/stores/useTemplateStore.ts` — MODIFIED (interface + implementation)
- `src/stores/useTemplateStore.test.ts` — MODIFIED (add import tests)

No new directories required. No Rust/Tauri commands required.

### References

- [Source: architecture.md#FR to Directory Mapping] `src/features/templates/` for FR16; `src/lib/` for utilities
- [Source: architecture.md#Implementation Patterns] Error → `useErrorStore`, Loading → Zustand store, no local `useState`
- [Source: architecture.md#Universal Web API Layer] Tauri APIs for OS file open — direct calls via Function() constructor
- [Source: src/lib/templateExport.ts] `saveTemplateTauri` — exact Function() constructor pattern to mirror for `readTemplateTauri`
- [Source: src/lib/templateExport.ts] `isTauri` — re-export from `templateImport.ts`
- [Source: src/stores/useTemplateStore.ts] `importTemplate` stub — Task 2 replaces this
- [Source: src/types/templates.ts] `TemplateExport`, `TemplateImportResult`, `ImportConflict` types
- [Source: src/lib/db.ts:395] `create_schema(db, name, fields, profileId, projectId, encryptionKey?)`
- [Source: src/lib/db.ts:777] `save_canvas(db, canvasId, nodes, edges, viewport, profileId, encryptionKey?)`
- [Source: src/features/templates/ExportTemplateButton.tsx] Exact styling to mirror for `ImportTemplateButton`
- [Source: src/features/dashboard/Dashboard.tsx:78] Integration point — `ExportTemplateButton` location
- [Source: _bmad-output/implementation-artifacts/2-7-template-engine-json-export.md] Export story — architecture patterns, `TemplateExport` shape, notification pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4.6 — 2026-03-08

### Debug Log References

### Completion Notes List

- Comprehensive context engine analysis completed
- Story 2.7 (export) dev notes exhaustively analyzed — import pipeline mirrors export patterns exactly
- `importTemplate` stub in `useTemplateStore.ts` confirmed — requires signature update (add `projectId`) and body replacement
- Key db.ts functions confirmed: `create_schema(db, name, fields, profileId, projectId)` and `save_canvas(db, canvasId, nodes, edges, viewport, profileId)` — no encryption key needed for import
- Dashboard.tsx toolbar confirmed — `ExportTemplateButton` at line ~78; `ImportTemplateButton` goes beside it unconditionally
- Tauri file read pattern derived from `saveTemplateTauri` in `templateExport.ts` — Function() constructor pattern confirmed
- No new directories required; `src/lib/` for utility, `src/features/templates/` for component
- Conflict detection strategy: skip-and-continue (best-effort import, no hard failure on name clashes)

### File List

- `_bmad-output/implementation-artifacts/2-8-template-engine-json-import.md` (CREATED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED — status: ready-for-dev)
- `src/lib/templateImport.ts` (CREATED — `validate_template`, `import_template`, `readTemplateBrowser`, `readTemplateTauri`)
- `src/lib/templateImport.test.ts` (CREATED — 5 unit tests)
- `src/stores/useTemplateStore.ts` (MODIFIED — update `importTemplate` interface signature + body, add `import_template` import)
- `src/stores/useTemplateStore.test.ts` (MODIFIED — add 2 import-path test cases)
- `src/features/templates/ImportTemplateButton.tsx` (CREATED)
- `src/features/dashboard/Dashboard.tsx` (MODIFIED — import + render `ImportTemplateButton`)
