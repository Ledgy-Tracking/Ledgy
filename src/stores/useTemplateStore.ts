import { create } from 'zustand';
import { useErrorStore } from './useErrorStore';
import { TemplateExport, TemplateImportResult } from '../types/templates';

interface TemplateState {
    isExporting: boolean;
    isImporting: boolean;
    error: string | null;

    // Actions
    exportTemplate: (profileId: string, includeNodeGraph?: boolean) => Promise<TemplateExport>;
    importTemplate: (template: TemplateExport, profileId: string) => Promise<TemplateImportResult>;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
    isExporting: false,
    isImporting: false,
    error: null,

    exportTemplate: async (profileId: string, includeNodeGraph = false) => {
        set({ isExporting: true, error: null });
        try {
            // TODO: Implement export_schema_graph in db.ts
            // TODO: Use Tauri dialog for file save
            const template: TemplateExport = {
                exportVersion: '1.0',
                exportedAt: new Date().toISOString(),
                profileName: `Profile ${profileId}`,
                schemas: [],
                nodeGraph: includeNodeGraph ? undefined : undefined,
            };
            set({ isExporting: false });
            return template;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to export template';
            set({ error: errorMsg, isExporting: false });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },

    importTemplate: async (template: TemplateExport, profileId: string) => {
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
}));
