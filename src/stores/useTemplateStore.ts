import { create } from 'zustand';
import { useErrorStore } from './useErrorStore';
import { useNotificationStore } from './useNotificationStore';
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
import { import_template } from '../lib/templateImport';

interface TemplateState {
    isExporting: boolean;
    isImporting: boolean;
    error: string | null;

    // Actions
    exportTemplate: (includeNodeGraph?: boolean) => Promise<void>;
    importTemplate: (template: TemplateExport, profileId: string, projectId: string) => Promise<TemplateImportResult>;
    reset: () => void;
}

const initialState = {
    isExporting: false,
    isImporting: false,
    error: null,
};

export const useTemplateStore = create<TemplateState>((set) => ({
    ...initialState,

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
                if (!filePath) {
                    // User cancelled
                    set({ isExporting: false });
                    return;
                }
            } else {
                // Browser download
                downloadTemplateBrowser(template, filename);
            }

            useNotificationStore.getState().addNotification('Template exported successfully', 'success');
            set({ isExporting: false });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to export template';
            set({ error: errorMsg, isExporting: false });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },

    importTemplate: async (template: TemplateExport, profileId: string, projectId: string) => {
        set({ isImporting: true, error: null });
        try {
            const db = getProfileDb(profileId);
            const result = await import_template(db, template, profileId, projectId);
            // Dispatch per-schema errors individually (AC #10)
            for (const errMsg of result.errors) {
                useErrorStore.getState().dispatchError(errMsg);
            }
            // Only notify success when at least one schema was actually imported (AC #9)
            if (result.importedSchemas > 0 || result.importedNodes > 0) {
                useNotificationStore.getState().addNotification('Template imported successfully', 'success');
            }
            set({ isImporting: false });
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to import template';
            set({ error: errorMsg, isImporting: false });
            useErrorStore.getState().dispatchError(errorMsg);
            throw err;
        }
    },

    reset: () => set(initialState),
}));
