/**
 * Validates a regular expression pattern string to prevent ReDoS (Regular Expression Denial of Service)
 * vulnerabilities and general regex compilation errors.
 *
 * @param pattern The regex pattern string to validate
 * @returns null if valid, or an error message string if invalid or unsafe
 */
export function validateRegexPattern(pattern: string | undefined | null): string | null {
    if (!pattern) return null;

    if (pattern.length > 250) {
        return 'Pattern exceeds maximum allowed length of 250 characters';
    }

    // Heuristic: Check for group containing a quantifier that is itself quantified.
    // e.g., (a+)+ or ([a-z]*)*
    const nestedQuantifierRegex = /\([^)]*(?:\+|\*|\{\s*\d+(?:\s*,\s*\d*)?\s*\})[^)]*\)(?:\+|\*|\{\s*\d+(?:\s*,\s*\d*)?\s*\})/;
    if (nestedQuantifierRegex.test(pattern)) {
        return 'Pattern contains dangerous nested quantifiers (ReDoS risk)';
    }

    try {
        new RegExp(pattern);
    } catch (e) {
        return 'Invalid RegEx pattern';
    }

    return null;
}
