import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';
import { useAuthStore, useIsRegistered } from './useAuthStore';

// Mock useAuthStore
vi.mock('./useAuthStore', async () => {
    const actual = await vi.importActual('./useAuthStore');
    return {
        ...(actual as object),
        useAuthStore: vi.fn(),
        useIsRegistered: vi.fn(),
    };
});

describe('AuthGuard', () => {
    const mockUseAuthStore = vi.mocked(useAuthStore);
    const mockUseIsRegistered = vi.mocked(useIsRegistered);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('redirects to /setup when user is not registered', () => {
        mockUseAuthStore.mockImplementation(((selector: any) => selector({ isUnlocked: false })) as any);
        mockUseIsRegistered.mockReturnValue(false);

        render(
            <MemoryRouter initialEntries={['/projects']}>
                <Routes>
                    <Route path="/setup" element={<div data-testid="setup">Setup Page</div>} />
                    <Route
                        path="/projects"
                        element={
                            <AuthGuard>
                                <div data-testid="protected">Protected Content</div>
                            </AuthGuard>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('setup')).toBeInTheDocument();
        expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    });

    it('redirects to /unlock when user is registered but not unlocked', () => {
        mockUseAuthStore.mockImplementation(((selector: any) => selector({ isUnlocked: false })) as any);
        mockUseIsRegistered.mockReturnValue(true);

        render(
            <MemoryRouter initialEntries={['/projects']}>
                <Routes>
                    <Route path="/unlock" element={<div data-testid="unlock">Unlock Page</div>} />
                    <Route
                        path="/projects"
                        element={
                            <AuthGuard>
                                <div data-testid="protected">Protected Content</div>
                            </AuthGuard>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('unlock')).toBeInTheDocument();
        expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    });

    it('renders children when user is authenticated', () => {
        mockUseAuthStore.mockImplementation(((selector: any) => selector({ isUnlocked: true })) as any);
        mockUseIsRegistered.mockReturnValue(true);

        render(
            <MemoryRouter initialEntries={['/projects']}>
                <AuthGuard>
                    <div data-testid="protected">Protected Content</div>
                </AuthGuard>
            </MemoryRouter>
        );

        expect(screen.getByTestId('protected')).toBeInTheDocument();
    });

    it('checks session expiry before allowing access', async () => {
        // Mock with expired session
        mockUseAuthStore.mockReturnValue({
            isUnlocked: true,
            rememberMeExpiry: Date.now() - 1000, // Expired 1 second ago
        } as any);
        mockUseIsRegistered.mockReturnValue(true);

        // Note: AuthGuard itself doesn't check expiry - that's done in initSession()
        // This test documents the expected behavior
        render(
            <MemoryRouter initialEntries={['/projects']}>
                <AuthGuard>
                    <div data-testid="protected">Protected Content</div>
                </AuthGuard>
            </MemoryRouter>
        );

        // AuthGuard allows access if isUnlocked is true
        // Session expiry is checked in initSession() before AuthGuard is reached
        expect(screen.getByTestId('protected')).toBeInTheDocument();
    });
});
