import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnlockPage } from './UnlockPage';
import { useAuthStore } from './useAuthStore';
import { MemoryRouter } from 'react-router-dom';

global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
} as any;

vi.mock('./useAuthStore', () => ({
    useAuthStore: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Using real input-otp component instead of mocking

describe('UnlockPage', () => {
    const mockUnlock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuthStore as any).mockImplementation((selector: any) => {
            const state = {
                totpSecret: 'dummy-secret',
                isUnlocked: false,
                unlock: mockUnlock,
            };
            return selector ? selector(state) : state;
        });
    });

    it('renders the unlock page', () => {
        render(
            <MemoryRouter>
                <UnlockPage />
            </MemoryRouter>
        );
        expect(screen.getByText(/Ledgy Locked/i)).toBeInTheDocument();
        expect(screen.getByText(/Enter your 6-digit TOTP code/i)).toBeInTheDocument();
    });

    it('calls unlock when 6 digits are entered', async () => {
        mockUnlock.mockResolvedValue(true);
        const { container } = render(
            <MemoryRouter>
                <UnlockPage />
            </MemoryRouter>
        );

        const input = container.querySelector('input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '123456' } });

        await waitFor(() => {
            expect(mockUnlock).toHaveBeenCalledWith('123456');
        });
        expect(mockNavigate).toHaveBeenCalledWith('/profiles');
    });

    it('displays error message on invalid code', async () => {
        mockUnlock.mockResolvedValue(false);
        const { container } = render(
            <MemoryRouter>
                <UnlockPage />
            </MemoryRouter>
        );

        const input = container.querySelector('input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '000000' } });

        await waitFor(() => {
            expect(screen.getByText(/Invalid code/i)).toBeInTheDocument();
        });
    });

    it('disables button when less than 6 digits', () => {
        const { container } = render(
            <MemoryRouter>
                <UnlockPage />
            </MemoryRouter>
        );

        const input = container.querySelector('input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '123' } });

        const button = screen.getByRole('button', { name: /Unlock Vault/i });
        expect(button).toBeDisabled();
    });
});
