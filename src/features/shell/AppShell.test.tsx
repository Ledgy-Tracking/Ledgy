import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppShell } from './AppShell';
import { useUIStore } from '../../stores/useUIStore';
import { MemoryRouter } from 'react-router-dom';

// Mock child components for isolated testing
vi.mock('./Sidebar', () => ({
    Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('./MainCanvas', () => ({
    MainCanvas: () => <div data-testid="main-canvas">Main Canvas</div>,
}));

vi.mock('./InspectorRail', () => ({
    InspectorRail: () => <div data-testid="inspector-rail">Inspector Rail</div>,
}));

vi.mock('../auth/AuthGuard', () => ({
    AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../shell/ErrorBoundary', () => ({
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('AppShell', () => {
    beforeEach(() => {
        // Reset UI store state
        useUIStore.setState({
            leftSidebarOpen: true,
            rightInspectorOpen: true,
            theme: 'light',
        });
    });

    it('renders all three panels', () => {
        render(
            <MemoryRouter>
                <AppShell />
            </MemoryRouter>
        );

        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('main-canvas')).toBeInTheDocument();
        expect(screen.getByTestId('inspector-rail')).toBeInTheDocument();
    });

    it('applies theme class to container', () => {
        useUIStore.setState({ theme: 'dark' });
        
        render(
            <MemoryRouter>
                <AppShell />
            </MemoryRouter>
        );

        const container = screen.getByTestId('sidebar').parentElement;
        expect(container).toHaveClass('dark');
    });

    it('handles keyboard shortcut Cmd+B for sidebar', () => {
        render(
            <MemoryRouter>
                <AppShell />
            </MemoryRouter>
        );

        // Simulate Cmd+B keydown
        fireEvent.keyDown(window, { key: 'b', metaKey: true });

        const state = useUIStore.getState();
        expect(state.leftSidebarOpen).toBe(false);
    });

    it('handles keyboard shortcut Cmd+I for inspector', () => {
        render(
            <MemoryRouter>
                <AppShell />
            </MemoryRouter>
        );

        // Simulate Cmd+I keydown
        fireEvent.keyDown(window, { key: 'i', metaKey: true });

        const state = useUIStore.getState();
        expect(state.rightInspectorOpen).toBe(false);
    });

    it('cleans up keyboard event listeners on unmount', () => {
        const { unmount } = render(
            <MemoryRouter>
                <AppShell />
            </MemoryRouter>
        );

        unmount();

        // After unmount, keyboard events should not trigger state changes
        const initialState = useUIStore.getState();
        fireEvent.keyDown(window, { key: 'b', metaKey: true });
        
        // State should remain unchanged after unmount
        const newState = useUIStore.getState();
        expect(newState.leftSidebarOpen).toBe(initialState.leftSidebarOpen);
    });
});
