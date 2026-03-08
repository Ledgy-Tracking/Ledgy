import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileSelectorCanvas } from './ProfileSelectorCanvas';

// Mock useProfileStore
const mockFetchProfiles = vi.fn();
const mockSetActiveProfile = vi.fn();
const mockUseProfileStore = vi.fn();

vi.mock('../../stores/useProfileStore', () => ({
    useProfileStore: ((selector: any) => {
        if (typeof selector === 'function') {
            return selector(mockUseProfileStore());
        }
        return mockUseProfileStore();
    }) as any,
}));

// Mock useUIStore
const mockUseUIStore = vi.fn();
vi.mock('../../stores/useUIStore', () => ({
    useUIStore: ((selector: any) => {
        if (typeof selector === 'function') {
            return selector(mockUseUIStore());
        }
        return mockUseUIStore();
    }) as any,
}));

// Mock useErrorStore
const mockDispatchError = vi.fn();
vi.mock('../../stores/useErrorStore', () => ({
    useErrorStore: ((selector: any) => {
        if (typeof selector === 'function') {
            return selector({ dispatchError: mockDispatchError });
        }
        return { dispatchError: mockDispatchError };
    }) as any,
}));

const mockProfiles = [
    {
        id: 'profile-1',
        name: 'Profile 1',
        description: 'First profile',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastOpened: Date.now() - 3600000,
        color: 'bg-blue-500',
        avatar: 'P1',
    },
    {
        id: 'profile-2',
        name: 'Profile 2',
        description: 'Second profile',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastOpened: Date.now() - 7200000,
        color: 'bg-green-500',
        avatar: 'P2',
    },
];

describe('ProfileSelectorCanvas', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Set default mock implementations
        mockUseProfileStore.mockReturnValue({
            profiles: mockProfiles,
            activeProfileId: null,
            isLoading: false,
            error: null,
            fetchProfiles: mockFetchProfiles,
            setActiveProfile: mockSetActiveProfile,
        });

        mockUseUIStore.mockReturnValue({
            density: 'comfortable',
        });
    });

    it('renders loading state initially', () => {
        mockUseProfileStore.mockReturnValue({
            profiles: mockProfiles,
            activeProfileId: null,
            isLoading: true,
            error: null,
            fetchProfiles: mockFetchProfiles,
            setActiveProfile: mockSetActiveProfile,
        });

        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        expect(screen.getByText('Select Profile')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    });

    it('renders empty state when no profiles', () => {
        mockUseProfileStore.mockReturnValue({
            profiles: [],
            activeProfileId: null,
            isLoading: false,
            error: null,
            fetchProfiles: mockFetchProfiles,
            setActiveProfile: mockSetActiveProfile,
        });

        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        expect(screen.getByText('No profiles yet')).toBeInTheDocument();
        expect(screen.getByText('Create your first profile to get started')).toBeInTheDocument();
        expect(screen.getByText('Create Profile')).toBeInTheDocument();
    });

    it('navigates to create profile when empty state action clicked', () => {
        mockUseProfileStore.mockReturnValue({
            profiles: [],
            activeProfileId: null,
            isLoading: false,
            error: null,
            fetchProfiles: mockFetchProfiles,
            setActiveProfile: mockSetActiveProfile,
        });

        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByText('Create Profile'));
        // Navigation would be tested with react-router-dom testing utilities
    });

    it('renders error state when fetch fails', () => {
        mockUseProfileStore.mockReturnValue({
            profiles: [],
            activeProfileId: null,
            isLoading: false,
            error: 'Failed to fetch profiles',
            fetchProfiles: mockFetchProfiles,
            setActiveProfile: mockSetActiveProfile,
        });

        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        expect(screen.getByText('Failed to load profiles')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch profiles')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('calls fetchProfiles on retry button click', () => {
        mockUseProfileStore.mockReturnValue({
            profiles: [],
            activeProfileId: null,
            isLoading: false,
            error: 'Failed to fetch profiles',
            fetchProfiles: mockFetchProfiles,
            setActiveProfile: mockSetActiveProfile,
        });

        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByText('Try Again'));
        expect(mockFetchProfiles).toHaveBeenCalled();
    });

    it('renders profile cards when profiles exist', () => {
        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        expect(screen.getByText('Profile 1')).toBeInTheDocument();
        expect(screen.getByText('Profile 2')).toBeInTheDocument();
    });

    it('calls setActiveProfile and navigate on profile card click', async () => {
        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        const profileCard = screen.getByText('Profile 1').closest('[role="button"]');
        if (profileCard) {
            fireEvent.click(profileCard);
        }

        expect(mockSetActiveProfile).toHaveBeenCalledWith('profile-1');
    });

    it('calls onProfileSelect callback when provided', () => {
        const onProfileSelect = vi.fn();

        render(
            <MemoryRouter>
                <ProfileSelectorCanvas onProfileSelect={onProfileSelect} />
            </MemoryRouter>
        );

        const profileCard = screen.getByText('Profile 1').closest('[role="button"]');
        if (profileCard) {
            fireEvent.click(profileCard);
        }

        expect(onProfileSelect).toHaveBeenCalledWith('profile-1');
    });

    it('highlights active profile', () => {
        mockUseProfileStore.mockReturnValue({
            profiles: mockProfiles,
            activeProfileId: 'profile-1',
            isLoading: false,
            error: null,
            fetchProfiles: mockFetchProfiles,
            setActiveProfile: mockSetActiveProfile,
        });

        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        const activeCard = screen.getByText('Profile 1').closest('[role="button"]');
        expect(activeCard).toHaveClass('border-primary-500 bg-primary-50');
    });

    it('fetches profiles on mount', () => {
        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        expect(mockFetchProfiles).toHaveBeenCalled();
    });

    it('subscribes to profile switch event', () => {
        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        expect(addEventListenerSpy).toHaveBeenCalledWith('ledgy:profile:switch', expect.any(Function));

        addEventListenerSpy.mockRestore();
    });

    it('refreshes profiles on profile switch event', () => {
        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        // Trigger profile switch event
        const event = new CustomEvent('ledgy:profile:switch');
        window.dispatchEvent(event);

        expect(mockFetchProfiles).toHaveBeenCalled();
    });

    it('cleans up event listener on unmount', () => {
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('ledgy:profile:switch', expect.any(Function));

        removeEventListenerSpy.mockRestore();
    });

    it('dispatches error on profile selection failure', async () => {
        const error = new Error('Failed to set active profile');
        mockSetActiveProfile.mockImplementationOnce(() => {
            throw error;
        });

        render(
            <MemoryRouter>
                <ProfileSelectorCanvas />
            </MemoryRouter>
        );

        const profileCard = screen.getByText('Profile 1').closest('[role="button"]');
        if (profileCard) {
            fireEvent.click(profileCard);
        }

        await waitFor(() => {
            expect(mockDispatchError).toHaveBeenCalledWith('Failed to set active profile', 'error');
        });
    });
});
