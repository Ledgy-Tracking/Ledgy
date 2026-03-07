import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { WelcomePage } from './WelcomePage';
import { ProfileSelector } from './ProfileSelector';
import { useProfileStore } from '../../stores/useProfileStore';
import { useUIStore } from '../../stores/useUIStore';

// ─── Mock react-router-dom navigate ──────────────────────────────────────────
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// ─── Helper ───────────────────────────────────────────────────────────────────
const renderWithRouter = (ui: React.ReactElement) =>
    render(ui, { wrapper: BrowserRouter });

const setup = (ui: React.ReactElement) => ({
    user: userEvent.setup(),
    ...renderWithRouter(ui),
});

// ─── WelcomePage unit tests ───────────────────────────────────────────────────

describe('WelcomePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useUIStore.setState({ theme: 'dark' });
    });

    // 3.1 — renders headline and CTA
    it('renders the Ledgy brand headline', () => {
        renderWithRouter(<WelcomePage />);
        expect(screen.getByText('Welcome to')).toBeDefined();
        expect(screen.getByText('Ledgy.')).toBeDefined();
    });

    it('renders the Create Your First Profile CTA button', () => {
        renderWithRouter(<WelcomePage />);
        const cta = screen.getByRole('button', { name: /create your first profile/i });
        expect(cta).toBeDefined();
    });

    it('renders supporting descriptive text', () => {
        renderWithRouter(<WelcomePage />);
        expect(screen.getByText(/your personal data toolkit/i)).toBeDefined();
    });

    // 3.2 — CTA navigates to /profiles/new
    it('navigates to /profiles/new when CTA is clicked', async () => {
        const { user } = setup(<WelcomePage />);
        const cta = screen.getByRole('button', { name: /create your first profile/i });
        await user.click(cta);
        expect(mockNavigate).toHaveBeenCalledWith('/profiles/new');
    });

    // 3.5 — keyboard accessibility
    it('CTA button is keyboard accessible (not disabled, is a <button>)', () => {
        renderWithRouter(<WelcomePage />);
        const cta = screen.getByRole('button', { name: /create your first profile/i });
        expect(cta.tagName).toBe('BUTTON');
        expect((cta as HTMLButtonElement).disabled).toBe(false);
    });

    it('CTA triggers navigate on Enter key press', async () => {
        const { user } = setup(<WelcomePage />);
        const cta = screen.getByRole('button', { name: /create your first profile/i });
        cta.focus();
        await user.keyboard('{Enter}');
        expect(mockNavigate).toHaveBeenCalledWith('/profiles/new');
    });

    it('CTA triggers navigate on Space key press', async () => {
        const { user } = setup(<WelcomePage />);
        const cta = screen.getByRole('button', { name: /create your first profile/i });
        cta.focus();
        await user.keyboard(' ');
        expect(mockNavigate).toHaveBeenCalledWith('/profiles/new');
    });

    it('theme toggle button is present with accessible label', () => {
        renderWithRouter(<WelcomePage />);
        const themeToggle = screen.getByRole('button', { name: /switch to light mode/i });
        expect(themeToggle).toBeDefined();
        expect(themeToggle.tagName).toBe('BUTTON');
    });

    it('has a main landmark with accessible label', () => {
        renderWithRouter(<WelcomePage />);
        const main = screen.getByRole('main');
        expect(main).toBeDefined();
        expect(main.getAttribute('aria-label')).toBe('Welcome to Ledgy');
    });
});

// ─── ProfileSelector integration tests ───────────────────────────────────────

describe('ProfileSelector - zero-profile state', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useUIStore.setState({ theme: 'dark' });
        // Prevent fetchProfiles from running auth checks and overwriting isLoading.
        // ProfileSelector's useEffect calls fetchProfiles() on mount.
        useProfileStore.setState({
            fetchProfiles: vi.fn().mockResolvedValue(undefined),
        } as any);
    });

    // 3.3 — renders WelcomePage when 0 profiles and loading is done
    it('renders WelcomePage when store has 0 profiles and loading is done', () => {
        useProfileStore.setState({
            profiles: [],
            isLoading: false,
            error: null,
        });

        renderWithRouter(<ProfileSelector />);

        expect(screen.getByRole('main', { name: /welcome to ledgy/i })).toBeDefined();
        expect(screen.getByText('Ledgy.')).toBeDefined();
    });

    it('does NOT render WelcomePage while profiles are still loading', () => {
        useProfileStore.setState({
            profiles: [],
            isLoading: true,
            error: null,
        });

        renderWithRouter(<ProfileSelector />);

        expect(screen.queryByRole('main', { name: /welcome to ledgy/i })).toBeNull();
    });

    // 3.4 — regression: profile grid renders when profiles exist
    it('renders the profile selector grid when profiles exist', () => {
        useProfileStore.setState({
            profiles: [
                {
                    id: 'profile:1',
                    name: 'Work Ledger',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ],
            isLoading: false,
            error: null,
        });

        renderWithRouter(<ProfileSelector />);

        expect(screen.getByText('Work Ledger')).toBeDefined();
        expect(screen.getByText('Select Profile')).toBeDefined();
        expect(screen.queryByRole('main', { name: /welcome to ledgy/i })).toBeNull();
    });
});
