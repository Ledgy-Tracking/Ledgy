import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../src/stores/useUIStore';

describe('useUIStore', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        useUIStore.setState({
            leftSidebarOpen: true,
            rightInspectorOpen: true,
            theme: 'dark',
        });
    });

    it('initializes with default values', () => {
        const state = useUIStore.getState();
        expect(state.leftSidebarOpen).toBe(true);
        expect(state.rightInspectorOpen).toBe(true);
        expect(state.theme).toBe('dark');
    });

    it('toggles left sidebar', () => {
        useUIStore.getState().toggleLeftSidebar();
        expect(useUIStore.getState().leftSidebarOpen).toBe(false);

        useUIStore.getState().toggleLeftSidebar();
        expect(useUIStore.getState().leftSidebarOpen).toBe(true);
    });

    it('sets left sidebar', () => {
        useUIStore.getState().setLeftSidebar(false);
        expect(useUIStore.getState().leftSidebarOpen).toBe(false);

        useUIStore.getState().setLeftSidebar(true);
        expect(useUIStore.getState().leftSidebarOpen).toBe(true);
    });

    it('toggles right inspector', () => {
        useUIStore.getState().toggleRightInspector();
        expect(useUIStore.getState().rightInspectorOpen).toBe(false);

        useUIStore.getState().toggleRightInspector();
        expect(useUIStore.getState().rightInspectorOpen).toBe(true);
    });

    it('sets right inspector', () => {
        useUIStore.getState().setRightInspector(false);
        expect(useUIStore.getState().rightInspectorOpen).toBe(false);

        useUIStore.getState().setRightInspector(true);
        expect(useUIStore.getState().rightInspectorOpen).toBe(true);
    });

    it('toggles theme', () => {
        useUIStore.getState().toggleTheme();
        expect(useUIStore.getState().theme).toBe('light');

        useUIStore.getState().toggleTheme();
        expect(useUIStore.getState().theme).toBe('dark');
    });

    it('sets theme', () => {
        useUIStore.getState().setTheme('light');
        expect(useUIStore.getState().theme).toBe('light');

        useUIStore.getState().setTheme('dark');
        expect(useUIStore.getState().theme).toBe('dark');
    });
});
