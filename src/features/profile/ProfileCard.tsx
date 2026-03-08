import React from 'react';
import { ProfileMetadata } from '../../types/profile';

interface ProfileCardProps {
    /** Profile metadata to display */
    profile: ProfileMetadata;
    /** Whether this profile is currently active */
    isActive: boolean;
    /** Callback when card is clicked */
    onClick: () => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * ProfileCard component displays an individual profile as a clickable card
 * Shows profile name, color/avatar, and last opened date
 * 
 * @example
 * <ProfileCard
 *     profile={profile}
 *     isActive={true}
 *     onClick={() => handleSelect(profile.id)}
 * />
 */
export function ProfileCard({
    profile,
    isActive,
    onClick,
    className = '',
}: ProfileCardProps) {
    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
        }
    };

    // Format relative time using Intl.RelativeTimeFormat
    const formatRelativeTime = (timestamp: string | number): string => {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const now = Date.now();
        const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
        const diff = now - time;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return rtf.format(-days, 'day');
        if (hours > 0) return rtf.format(-hours, 'hour');
        if (minutes > 0) return rtf.format(-minutes, 'minute');
        return 'Just now';
    };

    const lastOpenedText = profile.lastOpened
        ? `Last opened ${formatRelativeTime(profile.lastOpened)}`
        : 'Never opened';

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            className={`
                relative p-6 rounded-lg border-2 transition-all duration-200 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                ${isActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow'
                }
                ${className}
            `}
            aria-pressed={isActive}
            aria-label={`Select profile ${profile.name}`}
        >
            {/* Active indicator */}
            {isActive && (
                <div className="absolute top-3 right-3">
                    <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                    </span>
                </div>
            )}

            {/* Profile avatar/color */}
            <div className="flex items-center space-x-4">
                <div
                    className={`
                        flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                        text-white font-semibold text-lg
                        ${profile.color || 'bg-gray-400'}
                    `}
                    aria-hidden="true"
                >
                    {profile.avatar || profile.name.charAt(0).toUpperCase()}
                </div>

                {/* Profile info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {profile.name}
                    </h3>
                    {profile.description && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                            {profile.description}
                        </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        {lastOpenedText}
                    </p>
                </div>
            </div>
        </div>
    );
}
