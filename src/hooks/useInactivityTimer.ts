import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../features/auth/useAuthStore';

interface UseInactivityTimerOptions {
    /** Timeout in milliseconds (default: 15 minutes) */
    timeoutMs?: number;
    /** Enable/disable the timer (default: true) */
    enabled?: boolean;
    /** Callback when inactivity timeout occurs (default: lock) */
    onTimeout?: () => void;
}

/**
 * Hook to automatically lock the vault after a period of user inactivity.
 * 
 * Tracks user interactions (mousemove, keydown, click, scroll, touchstart)
 * and resets the inactivity timer on each event.
 * 
 * @param options - Configuration options
 */
export function useInactivityTimer(options: UseInactivityTimerOptions = {}) {
    const {
        timeoutMs = 15 * 60 * 1000, // 15 minutes default
        enabled = true,
        onTimeout,
    } = options;

    const isUnlocked = useAuthStore(state => state.isUnlocked);
    const timerRef = useRef<number | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // Clear existing timer
    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Handle inactivity timeout
    const handleTimeout = useCallback(() => {
        if (onTimeout) {
            onTimeout();
        } else {
            // Default: lock the vault using getState to avoid stale closures
            useAuthStore.getState().lock();
        }
    }, [onTimeout]);

    // Reset timer on user activity
    const resetTimer = useCallback(() => {
        if (!enabled || !isUnlocked) return;

        lastActivityRef.current = Date.now();
        clearTimer();

        timerRef.current = window.setTimeout(() => {
            handleTimeout();
        }, timeoutMs);
    }, [enabled, isUnlocked, timeoutMs, clearTimer, handleTimeout]);

    // Set up event listeners for user activity
    useEffect(() => {
        if (!enabled || !isUnlocked) {
            clearTimer();
            return;
        }

        // Events that indicate user activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'wheel'];

        // Throttled reset to avoid excessive timer resets
        let throttleTimeout: number | null = null;
        const throttledReset = () => {
            if (throttleTimeout !== null) return;

            throttleTimeout = window.setTimeout(() => {
                resetTimer();
                throttleTimeout = null;
            }, 1000); // Reset at most once per second
        };

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, throttledReset, { passive: true, capture: true });
        });

        // Initial timer start
        resetTimer();

        // Cleanup
        return () => {
            clearTimer();
            if (throttleTimeout !== null) {
                window.clearTimeout(throttleTimeout);
            }
            events.forEach(event => {
                window.removeEventListener(event, throttledReset, { capture: true });
            });
        };
    }, [enabled, isUnlocked, resetTimer, clearTimer]);

    // Manual reset function (can be called externally)
    const reset = useCallback(() => {
        resetTimer();
    }, [resetTimer]);

    return {
        /** Time since last activity in milliseconds */
        timeSinceLastActivity: Date.now() - lastActivityRef.current,
        /** Reset the inactivity timer manually */
        reset,
        /** Whether the timer is currently active */
        isActive: timerRef.current !== null,
    };
}
