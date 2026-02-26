import { Database, list_schemas, load_canvas } from '../lib/db';
import { TemplateExport } from '../types/templates';

/**
 * Exports profile schemas and node graph as portable template.
 * Excludes all ledger entries (personal data).
 * 
 * @param db - Profile database instance
 * @param includeNodeGraph - Whether to include node graph (default: true)
 * @param profileName - Human-readable profile name for the template
 * @returns Template export object
 */
export async function export_template(
    db: Database,
    includeNodeGraph = true,
    profileName: string
): Promise<TemplateExport> {
    // Get all schemas
    const schemas = await list_schemas(db);

    // Get node graph if requested
    let nodeGraph: TemplateExport['nodeGraph'] = undefined;

    if (includeNodeGraph) {
        try {
            const canvas = await load_canvas(db, 'default');
            if (canvas) {
                nodeGraph = {
                    nodes: canvas.nodes,
                    edges: canvas.edges,
                    viewport: canvas.viewport,
                };
            }
        } catch (e: any) {
            // Canvas might not exist yet - that's ok
            if (e.status !== 404) {
                console.warn('Failed to load canvas for export:', e);
            }
        }
    }

    return {
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        profileName,
        schemas,
        nodeGraph,
    };
}

/**
 * Generates filename for template export.
 * Format: {profile-name}-{date}.ledgy.json
 * 
 * @param profileName - Profile name
 * @param date - Date object (defaults to now)
 * @returns Filename string
 */
export function generateTemplateFilename(profileName: string, date = new Date()): string {
    const dateStr = date.toISOString().split('T')[0];
    // Sanitize profile name for filesystem
    const safeName = profileName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `${safeName}-${dateStr}.ledgy.json`;
}

/**
 * Downloads template as JSON file in browser.
 * 
 * @param template - Template export object
 * @param filename - Filename for download
 */
export function downloadTemplateBrowser(template: TemplateExport, filename: string): void {
    const jsonString = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);
}

/**
 * Saves template file using Tauri dialog.
 * Note: Uses Function constructor to avoid Vite resolving the import at build time.
 * 
 * @param template - Template export object
 * @param filename - Suggested filename
 * @returns Path to saved file, or null if cancelled
 */
export async function saveTemplateTauri(
    template: TemplateExport,
    filename: string
): Promise<string | null> {
    try {
        // Use Function constructor to avoid static analysis resolving the import
        // This is safe because we're importing from known Tauri packages
        const importTauriDialog = new Function('return import("@tauri-apps/api/dialog")') as () => Promise<any>;
        const importTauriFs = new Function('return import("@tauri-apps/api/fs")') as () => Promise<any>;

        const dialogModule = await importTauriDialog();
        const fsModule = await importTauriFs();

        const filePath = await dialogModule.save({
            filters: [{
                name: 'Ledgy Template',
                extensions: ['ledgy.json'],
            }],
            defaultPath: filename,
        });

        if (filePath) {
            const jsonString = JSON.stringify(template, null, 2);
            await fsModule.writeTextFile(filePath, jsonString);
            return filePath;
        }

        return null; // User cancelled
    } catch (e: any) {
        console.error('Tauri save failed:', e);
        throw new Error('Failed to save template file');
    }
}

/**
 * Detects if running in Tauri environment.
 */
export function isTauri(): boolean {
    return '__TAURI__' in window;
}
