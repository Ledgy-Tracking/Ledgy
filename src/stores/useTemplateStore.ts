import { create } from 'zustand';
import { useErrorStore } from './useErrorStore';
import { useProfileStore } from './useProfileStore';
import { getProfileDb } from '../lib/db';
import { TemplateExport, TemplateImportResult } from '../types/templates';
import {
    export_template,
    generateTemplateFilename,
    downloadTemplateBrowser,
    saveTemplateTauri,
    isTauri,
} from '../lib/templateExport';

interface TemplateState {
    isExporting: boolean;
    isImporting: boolean;
    error: string | null;

    // Actions
    exportTemplate: (includeNodeGraph?: boolean) => Promise<void>;
    importTemplate: (template: TemplateExport, profileId: string) => Promise<TemplateImportResult>;
}

export const useTemplateStore = create<TemplateState>((set) => ({
    isExporting: false,
    isImporting: false,
    error: null,

    exportTemplate: async (includeNodeGraph = true) => {
        set({ isExporting: true, error: null });
        try {
            const state = useProfileStore.getState();
            if (!state.activeProfileId) {
                throw new Error('No active profile selected');
            }

            const db = getProfileDb(state.activeProfileId);
            const profile = state.profiles.find(p => p.id === state.activeProfileId);
            const profileName = profile?.name || `Profile ${state.activeProfileId}`;

            // Export template
            const template = await export_template(db, includeNodeGraph, profileName);
            const filename = generateTemplateFilename(profileName);

            // Save based on environment
            if (isTauri()) {
                const filePath = await saveTemplateTauri(template, filename);
                if (filePath) {
                    console.log('Template saved to:', filePath);
                } else {
                    // User cancelled
                    set({ isExporting: false });
                    return;
                }
            } else {
                // Browser download
                downloadTemplateBrowser(template, filename);
            }

            set({ isExporting: false });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to export template';
            set({ error: errorMsg, isExporting: false });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },

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
}));
