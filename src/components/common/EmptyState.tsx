import React from 'react';
import { Button } from '../ui/button';

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
                <Button
                    onClick={onAction}
                    className="mt-6"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

