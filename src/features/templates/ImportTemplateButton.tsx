import React from 'react';
import { Upload } from 'lucide-react';
import { useTemplateStore } from '../../stores/useTemplateStore';
import { useErrorStore } from '../../stores/useErrorStore';
import { isTauri, readTemplateBrowser, readTemplateTauri, validate_template } from '../../lib/templateImport';

interface ImportTemplateButtonProps {
    profileId: string;
    projectId: string;
}

/**
 * Import Template button component.
 * Opens a file picker (browser) or native dialog (Tauri) to import a .ledgy.json template.
 */
export const ImportTemplateButton: React.FC<ImportTemplateButtonProps> = ({ profileId, projectId }) => {
    const { importTemplate, isImporting } = useTemplateStore();
    const { dispatchError } = useErrorStore();

    const handleImport = async () => {
        let rawData: unknown;
        try {
            rawData = isTauri() ? await readTemplateTauri() : await readTemplateBrowser();
        } catch (err: any) {
            dispatchError(err.message || 'Failed to read template file');
            return;
        }
        if (!rawData) return; // User cancelled
        if (!validate_template(rawData)) {
            dispatchError('Invalid template file: missing or malformed fields');
            return;
        }
        try {
            await importTemplate(rawData, profileId, projectId);
        } catch {
            // Error already dispatched by useTemplateStore.importTemplate
        }
    };

    return (
        <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:bg-gray-100/50 dark:disabled:bg-zinc-800/50 text-gray-700 dark:text-zinc-300 rounded transition-colors disabled:cursor-not-allowed"
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
