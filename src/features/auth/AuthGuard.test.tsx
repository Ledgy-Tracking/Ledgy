import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from './AuthGuard';
import { useAuthStore } from './useAuthStore';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./useAuthStore', () => ({
    useAuthStore: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        Navigate: vi.fn(({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />),
    };
});

describe('AuthGuard', () => {
    const Protected = () => <div data-testid="protected">Protected Content</div>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('redirects to /setup if not registered and not on /setup', () => {
        (useAuthStore as any).mockReturnValue({
            isRegistered: () => false,
            isUnlocked: false,
        });

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <AuthGuard>
                    <Protected />
                </AuthGuard>
            </MemoryRouter>
        );

        const navigate = screen.getByTestId('navigate');
        expect(navigate).toHaveAttribute('data-to', '/setup');
        expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    });

    it('renders children if not registered and on /setup', () => {
        (useAuthStore as any).mockReturnValue({
            isRegistered: () => false,
            isUnlocked: false,
        });

        render(
            <MemoryRouter initialEntries={['/setup']}>
                <AuthGuard>
                    <Protected />
                </AuthGuard>
            </MemoryRouter>
        );

        expect(screen.getByTestId('protected')).toBeInTheDocument();
        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('redirects to /unlock if registered but locked and not on /unlock', () => {
        (useAuthStore as any).mockReturnValue({
            isRegistered: () => true,
            isUnlocked: false,
        });

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <AuthGuard>
                    <Protected />
                </AuthGuard>
            </MemoryRouter>
        );

        const navigate = screen.getByTestId('navigate');
        expect(navigate).toHaveAttribute('data-to', '/unlock');
        expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    });

    it('renders children if registered but locked and on /unlock', () => {
        (useAuthStore as any).mockReturnValue({
            isRegistered: () => true,
            isUnlocked: false,
        });

        render(
            <MemoryRouter initialEntries={['/unlock']}>
                <AuthGuard>
                    <Protected />
                </AuthGuard>
            </MemoryRouter>
        );

        expect(screen.getByTestId('protected')).toBeInTheDocument();
        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('renders children if registered and unlocked', () => {
        (useAuthStore as any).mockReturnValue({
            isRegistered: () => true,
            isUnlocked: true,
        });

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <AuthGuard>
                    <Protected />
                </AuthGuard>
            </MemoryRouter>
        );

        expect(screen.getByTestId('protected')).toBeInTheDocument();
        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
});
