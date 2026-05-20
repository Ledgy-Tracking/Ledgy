/**
 * Security utilities
 */

/**
 * Validates a user-provided Regular Expression pattern to prevent ReDoS (Regular Expression Denial of Service).
 *
 * @param pattern The regex pattern string to validate
 * @returns An object containing `isValid` boolean and an optional `error` message string.
 */
export function validateRegexPattern(pattern: string): { isValid: boolean; error?: string } {
    if (!pattern) return { isValid: true }; // Empty is valid (usually means no constraint)

    if (pattern.length > 250) {
        return { isValid: false, error: 'Pattern exceeds maximum length of 250 characters' };
    }

    // Heuristic to block dangerous nested quantifiers (e.g., (a+)+, (a*)*) which can lead to ReDoS.
    // Unescape first to avoid false negatives with escaped parens or quantifiers
    const unescaped = pattern.replace(/\\./g, '');

    // Look for a group containing a + or * (not followed by ? which makes it lazy),
    // and the group itself is followed by + or *
    const dangerousRegex = /\([^)]*(?:[+*](?!\?))[^)]*\)(?:[+*](?!\?))/;

    if (dangerousRegex.test(unescaped)) {
        return { isValid: false, error: 'Pattern contains potentially dangerous nested quantifiers' };
    }

    try {
        new RegExp(pattern);
    } catch (e) {
        return { isValid: false, error: 'Invalid RegEx pattern' };
    }

    return { isValid: true };
}
