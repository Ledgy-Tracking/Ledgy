import { create } from 'zustand';
import { getProfileDb } from '../lib/db';
import { useErrorStore } from './useErrorStore';
import { useAuthStore } from '../features/auth/useAuthStore';
import { WidgetConfig } from '../features/dashboard/widgets';
import { save_dashboard_layout, load_dashboard_layout } from '../lib/db';

interface DashboardState {
    widgets: WidgetConfig[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchWidgets: (profileId: string, dashboardId?: string) => Promise<void>;
    saveWidgets: (profileId: string, widgets: WidgetConfig[], dashboardId?: string) => Promise<void>;
    addWidget: (widget: WidgetConfig) => void;
    updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
    removeWidget: (widgetId: string) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    widgets: [],
    isLoading: false,
    error: null,

    fetchWidgets: async (profileId: string, dashboardId = 'default') => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to fetch dashboard.');
            }

            const db = getProfileDb(profileId);
            const layout = await load_dashboard_layout(db, dashboardId);
            
            if (layout) {
                set({ widgets: layout.widgets, isLoading: false });
            } else {
                set({ widgets: [], isLoading: false });
            }
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to fetch dashboard';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    saveWidgets: async (profileId: string, widgets: WidgetConfig[], dashboardId = 'default') => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to save dashboard.');
            }

            const db = getProfileDb(profileId);
            await save_dashboard_layout(db, dashboardId, widgets, profileId);
            set({ widgets, isLoading: false });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to save dashboard';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    addWidget: (widget: WidgetConfig) => {
        set({ widgets: [...get().widgets, widget] });
    },

    updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => {
        set({
            widgets: get().widgets.map(w =>
                w.id === widgetId ? { ...w, ...updates } : w
            ),
        });
    },

    removeWidget: (widgetId: string) => {
        set({ widgets: get().widgets.filter(w => w.id !== widgetId) });
    },
}));
