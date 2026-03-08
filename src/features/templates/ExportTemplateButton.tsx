import React from 'react';
import { Download } from 'lucide-react';
import { useTemplateStore } from '../../stores/useTemplateStore';
import { useErrorStore } from '../../stores/useErrorStore';

/**
 * Export Template button component.
 * Triggers template export when clicked.
 */
export const ExportTemplateButton: React.FC = () => {
    const { exportTemplate, isExporting } = useTemplateStore();
    const { dispatchError } = useErrorStore();

    const handleExport = async () => {
        try {
            await exportTemplate(true);
            // Success - toast would be shown by store if configured
        } catch (err: any) {
            dispatchError(err.message || 'Export failed');
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-zinc-300 rounded transition-colors disabled:cursor-not-allowed"
            title="Export project as template (.ledgy.json)"
            aria-label="Export template"
        >
            <Download size={16} />
            <span>Export</span>
            {isExporting && (
                <span className="ml-1 text-xs text-zinc-500">...</span>
            )}
        </button>
    );
};
