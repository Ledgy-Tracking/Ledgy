import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface UIState {
    leftSidebarOpen: boolean;
    rightInspectorOpen: boolean;
    theme: Theme;
    schemaBuilderOpen: boolean;
    selectedNodeId: string | null;
    selectedEntryId: string | null;

    toggleLeftSidebar: () => void;
    setLeftSidebar: (open: boolean) => void;
    toggleRightInspector: () => void;
    setRightInspector: (open: boolean) => void;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    setSchemaBuilderOpen: (open: boolean) => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEntryId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            leftSidebarOpen: true,
            rightInspectorOpen: true,
            theme: 'dark',
            schemaBuilderOpen: false,
            selectedNodeId: null,
            selectedEntryId: null,

            toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
            setLeftSidebar: (open) => set({ leftSidebarOpen: open }),

            toggleRightInspector: () => set((state) => ({ rightInspectorOpen: !state.rightInspectorOpen })),
            setRightInspector: (open) => set({ rightInspectorOpen: open }),

            toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
            setTheme: (theme) => set({ theme }),
            setSchemaBuilderOpen: (open) => set({ schemaBuilderOpen: open }),
            setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEntryId: null }),
            setSelectedEntryId: (id) => set({ selectedEntryId: id, selectedNodeId: null }),
        }),
        {
            name: 'ledgy-ui-storage',
        }
    )
);
