import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from './useDashboardStore';
import { useErrorStore } from '../../stores/useErrorStore';

describe('useDashboardStore', () => {
    beforeEach(() => {
        useErrorStore.getState().clearError();
        useDashboardStore.getState().clearProfileData();
    });

    it('initializes with correct default state', () => {
        const state = useDashboardStore.getState();
        expect(state.widgets).toEqual([]);
        expect(state.layout).toEqual({ widgets: [] });
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
    });

    it('adds widget to dashboard', async () => {
        await useDashboardStore.getState().addWidget({
            id: 'widget-1',
            type: 'metric',
            title: 'Test Widget',
            x: 0,
            y: 0,
            width: 2,
            height: 1,
            config: {},
        });

        const state = useDashboardStore.getState();
        expect(state.widgets).toHaveLength(1);
        expect(state.widgets[0].title).toBe('Test Widget');
    });

    it('updates widget', async () => {
        await useDashboardStore.getState().addWidget({
            id: 'widget-1',
            type: 'metric',
            title: 'Original',
            x: 0,
            y: 0,
            width: 2,
            height: 1,
            config: {},
        });

        await useDashboardStore.getState().updateWidget('widget-1', { title: 'Updated' });
        const state = useDashboardStore.getState();
        expect(state.widgets[0].title).toBe('Updated');
    });

    it('removes widget', async () => {
        await useDashboardStore.getState().addWidget({
            id: 'widget-1',
            type: 'metric',
            title: 'To Remove',
            x: 0,
            y: 0,
            width: 2,
            height: 1,
            config: {},
        });

        await useDashboardStore.getState().removeWidget('widget-1');
        const state = useDashboardStore.getState();
        expect(state.widgets).toHaveLength(0);
    });

    it('updates layout', async () => {
        const newLayout = {
            widgets: [{
                id: 'widget-1',
                type: 'chart' as const,
                title: 'Chart',
                x: 0,
                y: 0,
                width: 4,
                height: 2,
                config: {},
            }],
        };

        await useDashboardStore.getState().updateLayout(newLayout);
        const state = useDashboardStore.getState();
        expect(state.layout.widgets).toHaveLength(1);
        expect(state.layout.widgets[0].type).toBe('chart');
    });

    it('saves dashboard to localStorage', async () => {
        await useDashboardStore.getState().addWidget({
            id: 'widget-1',
            type: 'metric',
            title: 'Test',
            x: 0,
            y: 0,
            width: 2,
            height: 1,
            config: {},
        });

        await useDashboardStore.getState().saveDashboard();
        const stored = localStorage.getItem('ledgy-dashboard');
        expect(stored).toBeTruthy();
    });

    it('loads dashboard from localStorage', async () => {
        const testLayout = {
            widgets: [{
                id: 'widget-1',
                type: 'metric' as const,
                title: 'Loaded',
                x: 0,
                y: 0,
                width: 2,
                height: 1,
                config: {},
            }],
        };
        localStorage.setItem('ledgy-dashboard', JSON.stringify(testLayout));

        await useDashboardStore.getState().loadDashboard();
        const state = useDashboardStore.getState();
        expect(state.widgets).toHaveLength(1);
        expect(state.widgets[0].title).toBe('Loaded');
    });

    it('subscription methods exist (structure for 1.5)', () => {
        // These are placeholder methods - full wiring in Story 1.5
        expect(() => useDashboardStore.getState().subscribeToNodeOutput('node-1')).not.toThrow();
        expect(() => useDashboardStore.getState().unsubscribeFromNodeOutput('node-1')).not.toThrow();
    });
});
