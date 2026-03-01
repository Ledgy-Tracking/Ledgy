interface LoadingSkeletonProps {
    /** Number of skeleton items to display */
    count?: number;
    /** Height of each skeleton line */
    height?: 'sm' | 'md' | 'lg' | string;
    /** Additional CSS classes */
    className?: string;
    /** ARIA label for accessibility */
    ariaLabel?: string;
}

/**
 * LoadingSkeleton component for displaying loading states
 * Uses Tailwind CSS animate-pulse for loading animation
 * 
 * @example
 * <LoadingSkeleton count={3} height="lg" />
 */
export function LoadingSkeleton({
    count = 3,
    height = 'md',
    className = '',
    ariaLabel = 'Loading content',
}: LoadingSkeletonProps) {
    const heightClasses = {
        sm: 'h-4',
        md: 'h-6',
        lg: 'h-8',
    };

    const heightClass = typeof height === 'string'
        ? (heightClasses[height as keyof typeof heightClasses] || height)
        : heightClasses.md;

    return (
        <div
            className={`space-y-3 ${className}`}
            role="status"
            aria-label={ariaLabel}
            aria-busy="true"
        >
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className={`w-full ${heightClass} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`}
                    style={{ animationDuration: '1.5s' }}
                />
            ))}
            <span className="sr-only">Loading...</span>
        </div>
    );
}
