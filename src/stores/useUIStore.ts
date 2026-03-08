import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useErrorStore } from './useErrorStore';

export type Theme = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';

interface UIState {
    leftSidebarOpen: boolean;
    rightInspectorOpen: boolean;
    theme: Theme;
    density: Density;
    schemaBuilderOpen: boolean;
    selectedNodeId: string | null;
    selectedEntryId: string | null;

    toggleLeftSidebar: () => void;
    setLeftSidebar: (open: boolean) => void;
    toggleRightInspector: () => void;
    setRightInspector: (open: boolean) => void;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    toggleDensity: () => void;
    setDensity: (density: Density) => void;
    setSchemaBuilderOpen: (open: boolean) => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEntryId: (id: string | null) => void;
    resetToDefaults: () => void;
}

// Default values for reset functionality
const DEFAULT_VALUES = {
    leftSidebarOpen: true,
    rightInspectorOpen: true,
    theme: 'dark' as Theme,
    density: 'comfortable' as Density,
    schemaBuilderOpen: false,
    selectedNodeId: null,
    selectedEntryId: null,
};

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            leftSidebarOpen: true,
            rightInspectorOpen: true,
            theme: 'dark',
            density: 'comfortable',
            schemaBuilderOpen: false,
            selectedNodeId: null,
            selectedEntryId: null,

            toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
            setLeftSidebar: (open) => set({ leftSidebarOpen: open }),

            toggleRightInspector: () => set((state) => ({ rightInspectorOpen: !state.rightInspectorOpen })),
            setRightInspector: (open) => set({ rightInspectorOpen: open }),

            toggleTheme: () => {
                try {
                    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to toggle theme';
                    useErrorStore.getState().dispatchError(errorMessage, 'error');
                }
            },
            setTheme: (theme) => {
                try {
                    set({ theme });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to set theme';
                    useErrorStore.getState().dispatchError(errorMessage, 'error');
                }
            },

            toggleDensity: () => {
                try {
                    set((state) => ({ density: state.density === 'comfortable' ? 'compact' : 'comfortable' }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to toggle density';
                    useErrorStore.getState().dispatchError(errorMessage, 'error');
                }
            },
            setDensity: (density) => {
                try {
                    set({ density });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to set density';
                    useErrorStore.getState().dispatchError(errorMessage, 'error');
                }
            },

            setSchemaBuilderOpen: (open) => set({ schemaBuilderOpen: open }),
            setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEntryId: null }),
            setSelectedEntryId: (id) => set({ selectedEntryId: id, selectedNodeId: null }),

            resetToDefaults: () => {
                try {
                    set(DEFAULT_VALUES);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to reset settings';
                    useErrorStore.getState().dispatchError(errorMessage, 'error');
                }
            },
        }),
        {
            name: 'ledgy-ui-storage',
        }
    )
);
