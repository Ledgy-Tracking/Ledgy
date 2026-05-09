/**
 * Utility functions for security
 */

/**
 * Validates a user-provided Regular Expression pattern to prevent ReDoS.
 * Enforces a 250-character limit and uses a heuristic to block dangerous
 * nested quantifiers (e.g., `(a+)+`, `([a-z]+)*`).
 *
 * @param pattern The regex pattern string to validate
 * @returns An error message if invalid, or null if valid
 */
export function validateRegexPattern(pattern: string): string | null {
    if (pattern.length > 250) {
        return 'Pattern exceeds maximum length of 250 characters';
    }

    // Remove escaped characters to avoid false positives (e.g. \+ or \*)
    let stripped = pattern.replace(/\\./g, '');

    // Remove character classes since quantifiers inside them are literal characters
    stripped = stripped.replace(/\[[^\]]*\]/g, '[]');

    // Heuristic for dangerous nested quantifiers: ( ... quantifier ... ) quantifier
    // Only looking for +, *, and { as they can cause catastrophic backtracking
    const dangerousNestedQuantifiers = /\([^)]*(?:\+|\*|\{\d+,?\d*\})[^)]*\)\s*(?:\+|\*|\{\d+,?\d*\})/;
    if (dangerousNestedQuantifiers.test(stripped)) {
        return 'Pattern contains potentially dangerous nested quantifiers';
    }

    // Validate that it actually compiles
    try {
        new RegExp(pattern);
    } catch {
        return 'Invalid RegEx pattern';
    }

    return null;
}
