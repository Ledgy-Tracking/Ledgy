import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnlockPage } from '../src/features/auth/UnlockPage';
import { useAuthStore } from '../src/features/auth/useAuthStore';
import { MemoryRouter } from 'react-router-dom';

global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
} as any;

document.elementFromPoint = vi.fn();

vi.mock('../src/features/auth/useAuthStore', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../src/features/auth/useAuthStore')>();
    return {
        ...actual,
        useAuthStore: vi.fn(),
    };
});

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
    const mockReset = vi.fn();
    const mockUnlockWithPassphrase = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuthStore as any).mockImplementation((selector: any) => {
            const state = {
                totpSecret: 'dummy-secret',
                isUnlocked: false,
                needsPassphrase: false,
                unlock: mockUnlock,
                unlockWithPassphrase: mockUnlockWithPassphrase,
                reset: mockReset,
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
            expect(mockUnlock).toHaveBeenCalledWith('123456', false, undefined, expect.anything());
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

    it('disables OTPInput when isSubmitting is true', async () => {
        let resolveUnlock: (val: boolean) => void;
        mockUnlock.mockReturnValue(new Promise(resolve => {
            resolveUnlock = resolve;
        }));

        const { container } = render(
            <MemoryRouter>
                <UnlockPage />
            </MemoryRouter>
        );

        const input = container.querySelector('input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '123456' } });

        await waitFor(() => {
            expect(input).toBeDisabled();
        });

        // cleanup
        resolveUnlock!(true);
    });

    it('calls reset() and navigates to /setup when "Not you?" is clicked', () => {
        render(
            <MemoryRouter>
                <UnlockPage />
            </MemoryRouter>
        );

        const resetButton = screen.getByRole('button', { name: /Reset vault/i });
        fireEvent.click(resetButton);

        expect(mockReset).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/setup');
    });

    it('passes rememberMe to unlock when checkbox is checked', async () => {
        mockUnlock.mockResolvedValue(true);
        const { container } = render(
            <MemoryRouter>
                <UnlockPage />
            </MemoryRouter>
        );

        const checkbox = screen.getByLabelText(/Remember me on this device/i);
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();

        const input = container.querySelector('input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '123456' } });

        await waitFor(() => {
            expect(mockUnlock).toHaveBeenCalledWith('123456', true, undefined, expect.anything());
        });
    });

    it('displays passphrase input when needsPassphrase is true', () => {
        (useAuthStore as any).mockImplementation((selector: any) => {
            const state = {
                totpSecret: 'dummy-secret',
                isUnlocked: false,
                needsPassphrase: true,
                unlock: mockUnlock,
                unlockWithPassphrase: mockUnlockWithPassphrase,
                reset: mockReset,
            };
            return selector ? selector(state) : state;
        });

        render(
            <MemoryRouter>
                <UnlockPage />
            </MemoryRouter>
        );

        expect(screen.getByPlaceholderText(/Enter passphrase/i)).toBeInTheDocument();
        expect(screen.queryByText(/Enter your 6-digit TOTP code/i)).not.toBeInTheDocument();
    });

    it('calls unlockWithPassphrase on submit', async () => {
        (useAuthStore as any).mockImplementation((selector: any) => {
            const state = {
                totpSecret: 'dummy-secret',
                isUnlocked: false,
                needsPassphrase: true,
                unlock: mockUnlock,
                unlockWithPassphrase: mockUnlockWithPassphrase,
                reset: mockReset,
            };
            return selector ? selector(state) : state;
        });

        mockUnlockWithPassphrase.mockResolvedValue(true);

        render(
            <MemoryRouter>
                <UnlockPage />
            </MemoryRouter>
        );

        const input = screen.getByPlaceholderText(/Enter passphrase/i);
        fireEvent.change(input, { target: { value: 'password123' } });

        const submitButton = screen.getByRole('button', { name: /Unlock with Passphrase/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockUnlockWithPassphrase).toHaveBeenCalledWith('password123');
        });
        expect(mockNavigate).toHaveBeenCalledWith('/profiles');
    });

    it('displays friendly error message on passphrase unlock failure', async () => {
        (useAuthStore as any).mockImplementation((selector: any) => {
            const state = {
                totpSecret: 'dummy-secret',
                isUnlocked: false,
                needsPassphrase: true,
                unlock: mockUnlock,
                unlockWithPassphrase: mockUnlockWithPassphrase,
                reset: mockReset,
            };
            return selector ? selector(state) : state;
        });

        mockUnlockWithPassphrase.mockRejectedValue(new Error('Decryption failed'));

        render(
            <MemoryRouter>
                <UnlockPage />
            </MemoryRouter>
        );

        const input = screen.getByPlaceholderText(/Enter passphrase/i);
        fireEvent.change(input, { target: { value: 'wrong' } });

        const submitButton = screen.getByRole('button', { name: /Unlock with Passphrase/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Incorrect passphrase/i)).toBeInTheDocument();
        });
    });

    it('displays already unlocked UI when isUnlocked is true', () => {
        (useAuthStore as any).mockImplementation((selector: any) => {
            const state = {
                totpSecret: 'dummy-secret',
                isUnlocked: true,
                needsPassphrase: false,
                unlock: mockUnlock,
                unlockWithPassphrase: mockUnlockWithPassphrase,
                reset: mockReset,
            };
            return selector ? selector(state) : state;
        });

        render(
            <MemoryRouter initialEntries={['/unlock?reset=true']}>
                <UnlockPage />
            </MemoryRouter>
        );

        expect(screen.getByText(/Vault Unlocked/i)).toBeInTheDocument();
        expect(screen.getByText(/Reset Vault & Logout/i)).toBeInTheDocument();
    });
});
