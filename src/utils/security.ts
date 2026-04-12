/**
 * Security utilities for the application.
 */

/**
 * Validates a user-provided regular expression pattern string to protect against
 * Regular Expression Denial of Service (ReDoS) vulnerabilities.
 *
 * Enforces a maximum length and uses heuristics to block dangerous nested quantifiers.
 *
 * @param pattern The regex pattern string to validate.
 * @throws Error if the pattern is too long, contains dangerous constructs, or is invalid.
 */
export function validateRegexPattern(pattern: string): void {
    // 1. Enforce length limit
    if (pattern.length > 100) {
        throw new Error('Regex pattern exceeds maximum length of 100 characters');
    }

    // 2. Heuristic check for nested quantifiers (e.g., (a+)+, (a*)*, (a{1,2})+)
    // This is a simplified heuristic to catch common ReDoS patterns.
    const dangerousNestedQuantifiers = /(\([^)]*(?:\+|\*|\{\d+(?:,\d*)?\})[^)]*\)(?:\+|\*|\{\d+(?:,\d*)?\}))/;
    if (dangerousNestedQuantifiers.test(pattern)) {
        throw new Error('Regex pattern contains potentially dangerous nested quantifiers (ReDoS risk)');
    }

    // 3. Verify it compiles
    try {
        new RegExp(pattern);
    } catch (e: any) {
        throw new Error(`Invalid regex pattern: ${e.message}`);
    }
}
