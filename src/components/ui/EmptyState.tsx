import React from 'react';

interface EmptyStateProps {
    /** Main heading text */
    title: string;
    /** Description text below the title */
    description?: string;
    /** Text for the action button */
    actionLabel?: string;
    /** Callback when action button is clicked */
    onAction?: () => void;
    /** Optional icon/illustration to display */
    icon?: React.ReactNode;
    /** Additional CSS classes */
    className?: string;
}

/**
 * EmptyState component for displaying empty states with optional action
 * 
 * @example
 * <EmptyState
 *     title="No profiles yet"
 *     description="Create your first profile to get started"
 *     actionLabel="Create Profile"
 *     onAction={() => navigate('/profiles/create')}
 * />
 */
export function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
    icon,
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
            role="status"
            aria-label={title}
        >
            {icon && (
                <div className="mb-4 text-gray-400 dark:text-gray-500" aria-hidden="true">
                    {icon}
                </div>
            )}

            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {title}
            </h2>

            {description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {description}
                </p>
            )}

            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900 transition-colors"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
