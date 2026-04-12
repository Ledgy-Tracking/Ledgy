/**
 * Connection Rejection Notification
 * Story 4-8: Strict Edge Type Validation - AC3 Visual Feedback
 *
 * Debounced notifications for connection rejections to prevent spam
 */

import { useErrorStore } from '../../../stores/useErrorStore';
import { getTypeDisplayName } from '../types/port';

/**
 * Debounce timer for rejection notifications
 */
let rejectionDebounceTimer: number | null = null;

/**
 * Last rejection message to prevent duplicates
 */
let lastRejectionMessage = '';

/**
 * Last rejection timestamp for rate limiting
 */
let lastRejectionTime = 0;

/**
 * Minimum time between rejection notifications (ms)
 */
const REJECTION_COOLDOWN = 500;

/**
 * Show a debounced rejection notification
 *
 * @param sourceType - Source port type
 * @param targetType - Target port type
 * @param customMessage - Optional custom message
 */
export const showRejectionNotification = (
    sourceType: string | null | undefined,
    targetType: string | null | undefined,
    customMessage?: string
): void => {
    // Clear any pending notification
    if (rejectionDebounceTimer) {
        clearTimeout(rejectionDebounceTimer);
    }

    // Debounce the notification
    rejectionDebounceTimer = window.setTimeout(() => {
        const sourceName = sourceType ? getTypeDisplayName(sourceType) : 'Unknown';
        const targetName = targetType ? getTypeDisplayName(targetType) : 'Unknown';

        const message = customMessage || `Cannot connect ${sourceName} to ${targetName}. Incompatible types.`;

        // Prevent duplicate messages
        if (message === lastRejectionMessage) {
            const timeSinceLast = Date.now() - lastRejectionTime;
            if (timeSinceLast < REJECTION_COOLDOWN) {
                return; // Skip duplicate within cooldown
            }
        }

        // Show the notification
        useErrorStore.getState().dispatchError(message, 'warning');

        // Update tracking
        lastRejectionMessage = message;
        lastRejectionTime = Date.now();

        rejectionDebounceTimer = null;
    }, 500); // 500ms debounce per AC3 spec
};

/**
 * Clear any pending rejection notification
 */
export const clearRejectionNotification = (): void => {
    if (rejectionDebounceTimer) {
        clearTimeout(rejectionDebounceTimer);
        rejectionDebounceTimer = null;
    }
};

/**
 * Announce rejection to screen readers (accessibility)
 *
 * @param sourceType - Source port type
 * @param targetType - Target port type
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
    setTimeout(() => {
        if (document.body.contains(announcement)) {
            document.body.removeChild(announcement);
        }
    }, 1000);
};

/**
 * Get helpful suggestion for type mismatch
 *
 * @param sourceType - Source port type
 * @param targetType - Target port type
 * @returns Suggestion message or empty string
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
