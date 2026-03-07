import { create } from 'zustand';

export interface Widget {
    id: string;
    type: 'metric' | 'chart' | 'trend' | 'table';
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    config: {
        nodeId?: string;
        metric?: string;
        chartType?: 'bar' | 'line' | 'area';
        [key: string]: unknown;
    };
}

export interface DashboardLayout {
    widgets: Widget[];
}

interface DashboardState {
    // State fields
    widgets: Widget[];
    layout: DashboardLayout;
    isLoading: boolean;
    error: string | null;

    // Actions
    addWidget: (widget: Widget) => Promise<void>;
    updateLayout: (layout: DashboardLayout) => Promise<void>;
    removeWidget: (widgetId: string) => Promise<void>;
    updateWidget: (widgetId: string, updates: Partial<Widget>) => Promise<void>;
    loadDashboard: () => Promise<void>;
    saveDashboard: () => Promise<void>;

    // Subscription to node store outputs (structure only - full wiring in 1.5)
    subscribeToNodeOutput: (nodeId: string) => void;
    unsubscribeFromNodeOutput: (nodeId: string) => void;
    // Memory Sweep
    clearProfileData: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    // Initial state
    widgets: [],
    layout: { widgets: [] },
    isLoading: false,
    error: null,

    addWidget: async (widget: Widget) => {
        set({ isLoading: true, error: null });
        try {
            const updatedWidgets = [...get().widgets, widget];
            const updatedLayout = { widgets: updatedWidgets };
            set({ widgets: updatedWidgets, layout: updatedLayout, isLoading: false });

            // Auto-save
            await get().saveDashboard();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add widget';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    updateLayout: async (layout: DashboardLayout) => {
        set({ isLoading: true, error: null });
        try {
            set({ layout, widgets: layout.widgets, isLoading: false });

            // Auto-save
            await get().saveDashboard();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update layout';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    removeWidget: async (widgetId: string) => {
        set({ isLoading: true, error: null });
        try {
            const updatedWidgets = get().widgets.filter(w => w.id !== widgetId);
            const updatedLayout = { widgets: updatedWidgets };
            set({ widgets: updatedWidgets, layout: updatedLayout, isLoading: false });

            // Auto-save
            await get().saveDashboard();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to remove widget';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    updateWidget: async (widgetId: string, updates: Partial<Widget>) => {
        set({ isLoading: true, error: null });
        try {
            const updatedWidgets = get().widgets.map(w =>
                w.id === widgetId ? { ...w, ...updates } : w
            );
            const updatedLayout = { widgets: updatedWidgets };
            set({ widgets: updatedWidgets, layout: updatedLayout, isLoading: false });

            // Auto-save
            await get().saveDashboard();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update widget';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    loadDashboard: async () => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            // For now, mock implementation
            const stored = localStorage.getItem('ledgy-dashboard');
            const layout: DashboardLayout = stored ? JSON.parse(stored) : { widgets: [] };
            set({ layout, widgets: layout.widgets, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    saveDashboard: async () => {
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            // For now, mock implementation
            const { layout } = get();
            localStorage.setItem('ledgy-dashboard', JSON.stringify(layout));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save dashboard';
            set({ error: errorMessage });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    // Subscription structure - full wiring in Story 1.5
    subscribeToNodeOutput: (nodeId: string) => {
        // TODO: Implement actual subscription to useNodeStore in Story 1.5
        // This is a placeholder for the subscription mechanism
        console.log(`[DashboardStore] Subscribing to node output: ${nodeId}`);
    },

    unsubscribeFromNodeOutput: (nodeId: string) => {
        // TODO: Implement actual unsubscription in Story 1.5
        console.log(`[DashboardStore] Unsubscribing from node output: ${nodeId}`);
    },

    clearProfileData: () => {
        set({
            widgets: [],
            layout: { widgets: [] },
            isLoading: false,
            error: null,
        });
    },
}));
