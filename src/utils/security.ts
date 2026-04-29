/**
 * Security utilities
 */

/**
 * Validates a user-provided regular expression pattern to prevent
 * Regular Expression Denial of Service (ReDoS) and excessively long patterns.
 *
 * @param pattern The regex string to validate
 * @returns The validated pattern
 * @throws Error if the pattern is too long or potentially dangerous
 */
export function validateRegexPattern(pattern: string): string {
    if (pattern.length > 250) {
        throw new Error('Regex pattern exceeds maximum allowed length of 250 characters');
    }

    // A heuristic to catch catastrophic backtracking vectors like `(a+)+` while avoiding
    // false positives on lazy quantifiers (`+?`, `*?`) or completely valid patterns.
    // It specifically looks for a group `(...)` containing a quantifier `+`, `*`, or `{...}`
    // which itself is quantified immediately afterward.
    if (/(\([^)]+[*+?{][^)]*\))[*+?{]/.test(pattern)) {
        throw new Error('Regex pattern contains potentially dangerous nested quantifiers');
    }

    return pattern;
}
