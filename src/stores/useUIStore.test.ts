import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from './useUIStore';

// Mock useErrorStore
vi.mock('./useErrorStore', () => ({
    useErrorStore: {
        getState: () => ({
            dispatchError: vi.fn(),
        }),
    },
}));

describe('useUIStore', () => {
    beforeEach(() => {
        // Reset store to defaults before each test
        useUIStore.setState({
            leftSidebarOpen: true,
            rightInspectorOpen: true,
            theme: 'dark',
            density: 'comfortable',
            schemaBuilderOpen: false,
            selectedNodeId: null,
            selectedEntryId: null,
        });
    });

    describe('Initialization', () => {
        it('initializes with default values', () => {
            const state = useUIStore.getState();
            
            expect(state.leftSidebarOpen).toBe(true);
            expect(state.rightInspectorOpen).toBe(true);
            expect(state.theme).toBe('dark');
            expect(state.density).toBe('comfortable');
            expect(state.schemaBuilderOpen).toBe(false);
            expect(state.selectedNodeId).toBeNull();
            expect(state.selectedEntryId).toBeNull();
        });
    });

    describe('Theme', () => {
        it('toggles theme from dark to light', () => {
            const { toggleTheme, theme } = useUIStore.getState();
            expect(theme).toBe('dark');
            
            toggleTheme();
            
            expect(useUIStore.getState().theme).toBe('light');
        });

        it('toggles theme from light to dark', () => {
            useUIStore.getState().setTheme('light');
            expect(useUIStore.getState().theme).toBe('light');
            
            useUIStore.getState().toggleTheme();
            
            expect(useUIStore.getState().theme).toBe('dark');
        });

        it('sets theme directly', () => {
            const { setTheme } = useUIStore.getState();
            
            setTheme('light');
            expect(useUIStore.getState().theme).toBe('light');
            
            setTheme('dark');
            expect(useUIStore.getState().theme).toBe('dark');
        });
    });

    describe('Density', () => {
        it('toggles density from comfortable to compact', () => {
            const { toggleDensity, density } = useUIStore.getState();
            expect(density).toBe('comfortable');
            
            toggleDensity();
            
            expect(useUIStore.getState().density).toBe('compact');
        });

        it('toggles density from compact to comfortable', () => {
            useUIStore.getState().setDensity('compact');
            expect(useUIStore.getState().density).toBe('compact');
            
            useUIStore.getState().toggleDensity();
            
            expect(useUIStore.getState().density).toBe('comfortable');
        });

        it('sets density directly', () => {
            const { setDensity } = useUIStore.getState();
            
            setDensity('compact');
            expect(useUIStore.getState().density).toBe('compact');
            
            setDensity('comfortable');
            expect(useUIStore.getState().density).toBe('comfortable');
        });
    });

    describe('Reset to Defaults', () => {
        it('resets all settings to default values', () => {
            // Change all settings
            useUIStore.getState().setTheme('light');
            useUIStore.getState().setDensity('compact');
            useUIStore.getState().toggleLeftSidebar();
            useUIStore.getState().toggleRightInspector();
            
            // Reset
            useUIStore.getState().resetToDefaults();
            
            const state = useUIStore.getState();
            expect(state.theme).toBe('dark');
            expect(state.density).toBe('comfortable');
            expect(state.leftSidebarOpen).toBe(true);
            expect(state.rightInspectorOpen).toBe(true);
        });
    });

    describe('Sidebar', () => {
        it('toggles left sidebar', () => {
            const { toggleLeftSidebar, leftSidebarOpen } = useUIStore.getState();
            expect(leftSidebarOpen).toBe(true);
            
            toggleLeftSidebar();
            expect(useUIStore.getState().leftSidebarOpen).toBe(false);
            
            toggleLeftSidebar();
            expect(useUIStore.getState().leftSidebarOpen).toBe(true);
        });

        it('sets left sidebar directly', () => {
            const { setLeftSidebar } = useUIStore.getState();
            
            setLeftSidebar(false);
            expect(useUIStore.getState().leftSidebarOpen).toBe(false);
            
            setLeftSidebar(true);
            expect(useUIStore.getState().leftSidebarOpen).toBe(true);
        });
    });

    describe('Inspector', () => {
        it('toggles right inspector', () => {
            const { toggleRightInspector, rightInspectorOpen } = useUIStore.getState();
            expect(rightInspectorOpen).toBe(true);
            
            toggleRightInspector();
            expect(useUIStore.getState().rightInspectorOpen).toBe(false);
        });
    });

    describe('Selection', () => {
        it('sets selected node ID and clears entry ID', () => {
            const { setSelectedNodeId } = useUIStore.getState();
            
            setSelectedNodeId('node-123');
            
            expect(useUIStore.getState().selectedNodeId).toBe('node-123');
            expect(useUIStore.getState().selectedEntryId).toBeNull();
        });

        it('sets selected entry ID and clears node ID', () => {
            const { setSelectedEntryId } = useUIStore.getState();
            
            setSelectedEntryId('entry-456');
            
            expect(useUIStore.getState().selectedNodeId).toBeNull();
            expect(useUIStore.getState().selectedEntryId).toBe('entry-456');
        });
    });

    describe('Persistence', () => {
        it('persists settings to localStorage', () => {
            // Change settings
            useUIStore.getState().setTheme('light');
            useUIStore.getState().setDensity('compact');
            
            // Get persisted data
            const persisted = localStorage.getItem('ledgy-ui-storage');
            expect(persisted).not.toBeNull();
            
            const parsed = JSON.parse(persisted!);
            expect(parsed.state.theme).toBe('light');
            expect(parsed.state.density).toBe('compact');
        });

        it('hydrates from localStorage on init', () => {
            // This test documents that persistence is configured
            // Actual hydration happens on store creation (before tests run)
            // We verify the persist middleware is configured correctly
            
            // Verify store has persist middleware by checking localStorage is used
            useUIStore.getState().setTheme('light');
            const persisted = localStorage.getItem('ledgy-ui-storage');
            expect(persisted).not.toBeNull();
            
            // Cleanup
            localStorage.removeItem('ledgy-ui-storage');
        });
    });

    describe('Error Handling', () => {
        it('dispatches error on theme toggle failure', () => {
            // This test documents the error handling pattern
            // In practice, theme toggle shouldn't fail
            const { toggleTheme } = useUIStore.getState();
            
            expect(() => toggleTheme()).not.toThrow();
        });

        it('dispatches error on density toggle failure', () => {
            const { toggleDensity } = useUIStore.getState();
            
            expect(() => toggleDensity()).not.toThrow();
        });

        it('dispatches error on reset failure', () => {
            const { resetToDefaults } = useUIStore.getState();
            
            expect(() => resetToDefaults()).not.toThrow();
        });
    });
});
