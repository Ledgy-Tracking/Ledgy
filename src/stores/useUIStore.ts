import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface UIState {
    leftSidebarOpen: boolean;
    rightInspectorOpen: boolean;
    theme: Theme;

    toggleLeftSidebar: () => void;
    setLeftSidebar: (open: boolean) => void;
    toggleRightInspector: () => void;
    setRightInspector: (open: boolean) => void;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            leftSidebarOpen: true,
            rightInspectorOpen: true,
            theme: 'dark',

            toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
            setLeftSidebar: (open) => set({ leftSidebarOpen: open }),

            toggleRightInspector: () => set((state) => ({ rightInspectorOpen: !state.rightInspectorOpen })),
            setRightInspector: (open) => set({ rightInspectorOpen: open }),

            toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'ledgy-ui-storage',
        }
    )
);
