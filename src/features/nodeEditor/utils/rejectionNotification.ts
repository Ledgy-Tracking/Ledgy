/**
 * Connection Rejection Notification
 * Story 4-8: Strict Edge Type Validation - AC3 Visual Feedback
 *
 * Debounced notifications for connection rejections to prevent spam
 * Uses React refs to avoid module-level state pollution
 */

import { useCallback, useRef, useEffect } from 'react';
import { useErrorStore } from '../../../stores/useErrorStore';
import { getTypeDisplayName } from '../types/port';

/**
 * Minimum time between rejection notifications (ms)
 */
const REJECTION_COOLDOWN = 500;

/**
 * Hook for managing rejection notifications with proper cleanup
 * Returns functions to show/clear notifications and announce to screen readers
 */
export const useRejectionNotifications = () => {
    // Use refs instead of module-level variables to avoid shared state issues
    const rejectionDebounceTimer = useRef<number | null>(null);
    const lastRejectionMessage = useRef('');
    const lastRejectionTime = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (rejectionDebounceTimer.current) {
                window.clearTimeout(rejectionDebounceTimer.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    /**
     * Show a debounced rejection notification
     */
    const showRejectionNotification = useCallback((
        sourceType: string | null | undefined,
        targetType: string | null | undefined,
        customMessage?: string
    ): void => {
        // Clear any pending notification
        if (rejectionDebounceTimer.current) {
            window.clearTimeout(rejectionDebounceTimer.current);
        }

        // Debounce the notification
        rejectionDebounceTimer.current = window.setTimeout(() => {
            const sourceName = sourceType ? getTypeDisplayName(sourceType) : 'Unknown';
            const targetName = targetType ? getTypeDisplayName(targetType) : 'Unknown';

            const message = customMessage || `Cannot connect ${sourceName} to ${targetName}. Incompatible types.`;

            // Prevent duplicate messages
            if (message === lastRejectionMessage.current) {
                const timeSinceLast = Date.now() - lastRejectionTime.current;
                if (timeSinceLast < REJECTION_COOLDOWN) {
                    return; // Skip duplicate within cooldown
                }
            }

            // Show the notification
            useErrorStore.getState().dispatchError(message, 'warning');

            // Update tracking
            lastRejectionMessage.current = message;
            lastRejectionTime.current = Date.now();

            rejectionDebounceTimer.current = null;
        }, 500); // 500ms debounce per AC3 spec
    }, []);

    /**
     * Clear any pending rejection notification
     */
    const clearRejectionNotification = useCallback((): void => {
        if (rejectionDebounceTimer.current) {
            window.clearTimeout(rejectionDebounceTimer.current);
            rejectionDebounceTimer.current = null;
        }
    }, []);

    /**
     * Announce rejection to screen readers (accessibility)
     */
    const announceRejection = useCallback((
        sourceType: string | null | undefined,
        targetType: string | null | undefined
    ): void => {
        // Create new abort controller for this announcement
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        const sourceName = sourceType ? getTypeDisplayName(sourceType) : 'Unknown';
        const targetName = targetType ? getTypeDisplayName(targetType) : 'Unknown';

        // Create ARIA live announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'alert');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = `Connection rejected. Cannot connect ${sourceName} output to ${targetName} input. These types are incompatible.`;

        document.body.appendChild(announcement);

        // Remove after announcement (with abort support)
        window.setTimeout(() => {
            if (!signal.aborted && document.body.contains(announcement)) {
                document.body.removeChild(announcement);
            }
        }, 1000);
    }, []);

    return {
        showRejectionNotification,
        clearRejectionNotification,
        announceRejection,
    };
};

// Legacy standalone functions for backward compatibility (deprecated)
// These maintain module-level state for existing callers but should be migrated
let legacyRejectionDebounceTimer: number | null = null;
let legacyLastRejectionMessage = '';
let legacyLastRejectionTime = 0;

/**
 * @deprecated Use useRejectionNotifications hook instead
 */
export const showRejectionNotification = (
    sourceType: string | null | undefined,
    targetType: string | null | undefined,
    customMessage?: string
): void => {
    // Clear any pending notification
    if (legacyRejectionDebounceTimer) {
        window.clearTimeout(legacyRejectionDebounceTimer);
    }

    // Debounce the notification
    legacyRejectionDebounceTimer = window.setTimeout(() => {
        const sourceName = sourceType ? getTypeDisplayName(sourceType) : 'Unknown';
        const targetName = targetType ? getTypeDisplayName(targetType) : 'Unknown';

        const message = customMessage || `Cannot connect ${sourceName} to ${targetName}. Incompatible types.`;

        // Prevent duplicate messages
        if (message === legacyLastRejectionMessage) {
            const timeSinceLast = Date.now() - legacyLastRejectionTime;
            if (timeSinceLast < REJECTION_COOLDOWN) {
                return;
            }
        }

        // Show the notification
        useErrorStore.getState().dispatchError(message, 'warning');

        // Update tracking
        legacyLastRejectionMessage = message;
        legacyLastRejectionTime = Date.now();

        legacyRejectionDebounceTimer = null;
    }, 500);
};

/**
 * @deprecated Use useRejectionNotifications hook instead
 */
export const clearRejectionNotification = (): void => {
    if (legacyRejectionDebounceTimer) {
        window.clearTimeout(legacyRejectionDebounceTimer);
        legacyRejectionDebounceTimer = null;
    }
};

/**
 * @deprecated Use useRejectionNotifications hook instead
 */
export const announceRejection = (
    sourceType: string | null | undefined,
    targetType: string | null | undefined
): void => {
    const sourceName = sourceType ? getTypeDisplayName(sourceType) : 'Unknown';
    const targetName = targetType ? getTypeDisplayName(targetType) : 'Unknown';

    // Create ARIA live announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Connection rejected. Cannot connect ${sourceName} output to ${targetName} input. These types are incompatible.`;

    document.body.appendChild(announcement);

    // Remove after announcement
    window.setTimeout(() => {
        if (document.body.contains(announcement)) {
            document.body.removeChild(announcement);
        }
    }, 1000);
};

/**
 * Get helpful suggestion for type mismatch
 */
export const getRejectionSuggestion = (
    sourceType: string | null | undefined,
    targetType: string | null | undefined
): string => {
    if (!sourceType || !targetType) return '';

    // Number to non-number array
    if (sourceType === 'number' && targetType === 'number[]') {
        return 'Tip: Number can connect to Number Array (will wrap in array)';
    }

    // Number array to number
    if (sourceType === 'number[]' && targetType === 'number') {
        return 'Tip: Number Array can connect to Number (will use first element)';
    }

    // Text trying to connect to number
    if (sourceType === 'text' && (targetType === 'number' || targetType === 'number[]')) {
        return 'Tip: Text cannot connect to Number. Try using a Text node instead.';
    }

    // Common mismatches
    const sourceName = getTypeDisplayName(sourceType);

    return `Try connecting to a compatible ${sourceName} input instead.`;
};

export default useRejectionNotifications;
