import { useEffect } from 'react';
import { useAuthStore } from './useAuthStore';

/**
 * Component that automatically locks the vault when:
 * - User closes the tab/window (beforeunload)
 * - User switches to another tab (visibilitychange, with delay)
 * 
 * This component should be rendered at the app level to ensure
 * auto-lock works across the entire application.
 */
export const AutoLock = () => {
    const lock = useAuthStore(state => state.lock);
    const isUnlocked = useAuthStore(state => state.isUnlocked);

    useEffect(() => {
        if (!isUnlocked) return;

        // Auto-lock on tab close/window close
        const handleBeforeUnload = () => {
            lock();
        };

        // Auto-lock on tab visibility change (with 5-second delay)
        // This handles mobile apps going to background
        let visibilityTimeout: number | null = null;
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab became hidden - lock after 5 seconds
                visibilityTimeout = window.setTimeout(() => {
                    lock();
                }, 5000);
            } else {
                // Tab became visible again - clear timeout
                if (visibilityTimeout !== null) {
                    window.clearTimeout(visibilityTimeout);
                    visibilityTimeout = null;
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (visibilityTimeout !== null) {
                window.clearTimeout(visibilityTimeout);
            }
        };
    }, [isUnlocked, lock]);

    // This component doesn't render anything
    return null;
};
