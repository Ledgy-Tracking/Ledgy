import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GuestGuard } from './GuestGuard';
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

describe('GuestGuard', () => {
    const mockUseAuthStore = vi.mocked(useAuthStore);
    const mockUseIsRegistered = vi.mocked(useIsRegistered);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('redirects to /profiles when user is authenticated', () => {
        mockUseAuthStore.mockImplementation(((selector: any) => selector({ isUnlocked: true })) as any);
        mockUseIsRegistered.mockReturnValue(true);

        render(
            <MemoryRouter initialEntries={['/setup']}>
                <Routes>
                    <Route path="/profiles" element={<div data-testid="profiles">Profiles Page</div>} />
                    <Route
                        path="/setup"
                        element={
                            <GuestGuard>
                                <div data-testid="guest">Guest Content</div>
                            </GuestGuard>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('profiles')).toBeInTheDocument();
        expect(screen.queryByTestId('guest')).not.toBeInTheDocument();
    });

    it('redirects to /unlock when user is registered but not on auth pages', () => {
        mockUseAuthStore.mockImplementation(((selector: any) => selector({ isUnlocked: false })) as any);
        mockUseIsRegistered.mockReturnValue(true);

        render(
            <MemoryRouter initialEntries={['/setup']}>
                <Routes>
                    <Route path="/unlock" element={<div data-testid="unlock">Unlock Page</div>} />
                    <Route
                        path="/setup"
                        element={
                            <GuestGuard>
                                <div data-testid="guest">Guest Content</div>
                            </GuestGuard>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('unlock')).toBeInTheDocument();
        expect(screen.queryByTestId('guest')).not.toBeInTheDocument();
    });

    it('renders children when user is not registered (first-time setup)', () => {
        mockUseAuthStore.mockImplementation(((selector: any) => selector({ isUnlocked: false })) as any);
        mockUseIsRegistered.mockReturnValue(false);

        render(
            <MemoryRouter initialEntries={['/setup']}>
                <GuestGuard>
                    <div data-testid="guest">Guest Content</div>
                </GuestGuard>
            </MemoryRouter>
        );

        expect(screen.getByTestId('guest')).toBeInTheDocument();
    });

    it('allows access to /unlock for registered but locked users', () => {
        mockUseAuthStore.mockImplementation(((selector: any) => selector({ isUnlocked: false })) as any);
        mockUseIsRegistered.mockReturnValue(true);

        render(
            <MemoryRouter initialEntries={['/unlock']}>
                <Routes>
                    <Route
                        path="/unlock"
                        element={
                            <GuestGuard>
                                <div data-testid="unlock-content">Unlock Form</div>
                            </GuestGuard>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        // GuestGuard redirects to /unlock, so the unlock page renders
        // This test verifies the guard doesn't block the unlock page
        expect(screen.getByTestId('unlock-content')).toBeInTheDocument();
    });

    it('prevents double-registration scenarios', () => {
        // User is already registered and unlocked
        mockUseAuthStore.mockImplementation(((selector: any) => selector({ isUnlocked: true })) as any);
        mockUseIsRegistered.mockReturnValue(true);

        render(
            <MemoryRouter initialEntries={['/setup']}>
                <GuestGuard>
                    <div data-testid="setup-form">Setup Form</div>
                </GuestGuard>
            </MemoryRouter>
        );

        // Should redirect away, preventing double registration
        expect(screen.queryByTestId('setup-form')).not.toBeInTheDocument();
    });
});
