import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTemplateStore } from '../../stores/useTemplateStore';

/**
 * Export Template button component.
 * Triggers template export when clicked.
 */
export const ExportTemplateButton: React.FC = () => {
    const { exportTemplate, isExporting } = useTemplateStore();

    const handleExport = () => {
        exportTemplate(true);
    };

    return (
        <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            title="Export project as template (.ledgy.json)"
            aria-label="Export template"
        >
            <Download size={16} />
            <span>Export</span>
            {isExporting && (
                <span className="ml-1 text-xs text-zinc-500">...</span>
            )}
        </Button>
    );
};
