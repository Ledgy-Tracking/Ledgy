import { Database, create_schema, list_schemas, save_canvas } from './db';
import { TemplateExport, TemplateImportResult, ImportConflict } from '../types/templates';

export { isTauri } from './templateExport';

/**
 * Validates that the given unknown data matches the TemplateExport shape.
 * Checks exportVersion === '1.0', schemas is a non-empty array,
 * and each schema has a non-empty name string and fields array.
 */
export function validate_template(data: unknown): data is TemplateExport {
    if (typeof data !== 'object' || data === null) return false;
    const d = data as any;
    if (d.exportVersion !== '1.0') return false;
    if (!Array.isArray(d.schemas) || d.schemas.length === 0) return false;
    for (const s of d.schemas) {
        if (typeof s.name !== 'string' || !s.name.trim()) return false;
        if (!Array.isArray(s.fields)) return false;
    }
    return true;
}

/**
 * Imports schemas and optional node graph from a validated template.
 * Skips schemas whose names already exist (conflict detection).
 * Continues on per-schema errors (best-effort import).
 */
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

    // Conflict detection: get existing schema names once before loop
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
            await save_canvas(
                db,
                'default',
                template.nodeGraph.nodes,
                template.nodeGraph.edges,
                template.nodeGraph.viewport,
                profileId
            );
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

/**
 * Opens a native OS file dialog via Tauri to select a template file.
 * Uses dynamic import with @vite-ignore to avoid Vite static analysis of Tauri imports.
 * Returns null if the user cancels.
 */
export async function readTemplateTauri(): Promise<TemplateExport | null> {
    try {
        // Use variables for paths to completely bypass Vite's static analysis of import() literals
        const dialogPath = "@tauri-apps/api/dialog";
        const fsPath = "@tauri-apps/api/fs";

        // @ts-ignore: Dynamic import for Tauri APIs (ignored by Vite/TypeScript during web builds)
        const dialogModule = await import(/* @vite-ignore */ dialogPath);
        // @ts-ignore: Dynamic import for Tauri APIs (ignored by Vite/TypeScript during web builds)
        const fsModule = await import(/* @vite-ignore */ fsPath);

        const filePath = await dialogModule.open({
            filters: [{ name: 'Ledgy Template', extensions: ['json'] }],
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

/**
 * Opens a browser file picker to select a template file.
 * Returns null if the user cancels.
 */
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

        // Fallback for browsers that don't fire oncancel (e.g. older Firefox/Safari):
        // detect cancel via window focus returning without a file selection.
        const onWindowFocus = () => {
            window.removeEventListener('focus', onWindowFocus);
            // Give the change event a chance to fire first
            setTimeout(() => {
                if (!input.files?.length) resolve(null);
            }, 300);
        };
        window.addEventListener('focus', onWindowFocus, { once: true });

        input.click();
    });
}
