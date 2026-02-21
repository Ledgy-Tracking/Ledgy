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

document.elementFromPoint = vi.fn();

vi.mock('./useAuthStore', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./useAuthStore')>();
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
});
