import { create } from 'zustand';
import { useErrorStore } from './useErrorStore';
import { PluginManifest, PluginPermissions } from '../types/plugin';

interface PluginState {
    plugins: PluginManifest[];
    enabledPlugins: string[];
    permissions: PluginPermissions[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadPlugins: () => Promise<void>;
    installPlugin: (manifest: PluginManifest) => Promise<void>;
    enablePlugin: (pluginId: string) => Promise<void>;
    disablePlugin: (pluginId: string) => Promise<void>;
    uninstallPlugin: (pluginId: string) => Promise<void>;
    grantPermissions: (pluginId: string, permissions: string[]) => Promise<void>;
}

export const usePluginStore = create<PluginState>((set, get) => ({
    plugins: [],
    enabledPlugins: [],
    permissions: [],
    isLoading: false,
    error: null,

    loadPlugins: async () => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Load plugins from plugin directory
            set({ isLoading: false });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to load plugins';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    installPlugin: async (manifest: PluginManifest) => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Validate manifest and copy plugin files
            set((state) => ({
                plugins: [...state.plugins, manifest],
                isLoading: false,
            }));
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to install plugin';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    enablePlugin: async (pluginId: string) => {
        try {
            set((state) => ({
                enabledPlugins: [...state.enabledPlugins, pluginId],
            }));
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to enable plugin';
            set({ error: errorMsg });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    disablePlugin: async (pluginId: string) => {
        try {
            set((state) => ({
                enabledPlugins: state.enabledPlugins.filter((id) => id !== pluginId),
            }));
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to disable plugin';
            set({ error: errorMsg });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    uninstallPlugin: async (pluginId: string) => {
        try {
            set((state) => ({
                plugins: state.plugins.filter((p) => p.id !== pluginId),
                enabledPlugins: state.enabledPlugins.filter((id) => id !== pluginId),
            }));
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to uninstall plugin';
            set({ error: errorMsg });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    grantPermissions: async (pluginId: string, permissions: string[]) => {
        try {
            set((state) => ({
                permissions: [
                    ...state.permissions.filter((p) => p.pluginId !== pluginId),
                    { pluginId, granted: permissions, denied: [] },
                ],
            }));
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to grant permissions';
            set({ error: errorMsg });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },
}));
