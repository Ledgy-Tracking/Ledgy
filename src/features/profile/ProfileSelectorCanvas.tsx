import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../../stores/useProfileStore';
import { useErrorStore } from '../../stores/useErrorStore';
import { useUIStore } from '../../stores/useUIStore';
import { ProfileCard } from './ProfileCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';

// Note: ErrorBoundary is applied at route level (Story 1-2 pattern)
// This component assumes it's wrapped by <ErrorBoundary> in the route definition

// Route constants
const DEFAULT_REDIRECT_ROUTE = '/dashboard';

interface ProfileSelectorCanvasProps {
    /** Optional callback when profile is selected */
    onProfileSelect?: (profileId: string) => void;
}

/**
 * ProfileSelectorCanvas component displays a grid of all profiles
 * Handles loading, error, and empty states
 * Subscribes to profile switch events for real-time updates
 * 
 * @example
 * <ProfileSelectorCanvas onProfileSelect={(id) => console.log('Selected:', id)} />
 */
export function ProfileSelectorCanvas({
    onProfileSelect,
}: ProfileSelectorCanvasProps) {
    const navigate = useNavigate();
    const { profiles, fetchProfiles, setActiveProfile, isLoading, error } = useProfileStore();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const { density } = useUIStore();
    const dispatchError = useErrorStore((state) => state.dispatchError);

    // Fetch profiles on mount
    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    // Subscribe to profile switch events and refresh list
    useEffect(() => {
        const handleProfileSwitch = () => {
            fetchProfiles();
        };

        window.addEventListener('ledgy:profile:switch', handleProfileSwitch);
        return () => window.removeEventListener('ledgy:profile:switch', handleProfileSwitch);
    }, [fetchProfiles]);

    const handleProfileSelect = async (profileId: string) => {
        try {
            // Set active profile
            setActiveProfile(profileId);

            // Call optional callback
            onProfileSelect?.(profileId);

            // Navigate to home dashboard
            navigate(DEFAULT_REDIRECT_ROUTE);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to select profile';
            dispatchError(errorMessage, 'error');
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                    Select Profile
                </h2>
                <div
                    className={`grid gap-6 ${
                        density === 'compact'
                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}
                >
                    <LoadingSkeleton count={6} height="lg" />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-6">
                <EmptyState
                    title="Failed to load profiles"
                    description={error}
                    actionLabel="Try Again"
                    onAction={() => fetchProfiles()}
                    icon={
                        <svg
                            className="w-16 h-16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    }
                />
            </div>
        );
    }

    // Empty state
    if (!profiles || profiles.length === 0) {
        return (
            <div className="p-6">
                <EmptyState
                    title="No profiles yet"
                    description="Create your first profile to get started"
                    actionLabel="Create Profile"
                    onAction={() => navigate('/profiles/create')}
                    icon={
                        <svg
                            className="w-16 h-16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                        </svg>
                    }
                />
            </div>
        );
    }

    // Profile grid
    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Select Profile
            </h2>
            <div
                className={`grid ${
                    density === 'compact'
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                }`}
                style={{
                    gap: density === 'compact' ? 'var(--spacing-4, 1rem)' : 'var(--spacing-6, 1.5rem)',
                }}
            >
                {profiles.map((profile) => (
                    <ProfileCard
                        key={profile.id}
                        profile={profile}
                        isActive={profile.id === activeProfileId}
                        onClick={() => handleProfileSelect(profile.id)}
                    />
                ))}
            </div>
        </div>
    );
}
