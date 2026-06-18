/**
 * Utility functions for security-related checks and validations.
 */

/**
 * Validates a user-provided Regular Expression pattern to prevent ReDoS (Regular Expression Denial of Service).
 * It enforces a length limit and checks for dangerous nested quantifiers (e.g. `(a+)+`) before it
 * can be compiled into a RegExp object.
 *
 * @param pattern The regex pattern string to validate
 * @returns boolean true if the pattern is safe and valid, false otherwise
 */
export function validateRegexPattern(pattern: string | undefined): boolean {
    if (!pattern) return true; // Empty pattern is considered valid (no-op)

    // 1. Length constraint (prevent excessively long patterns which take longer to parse/execute)
    if (pattern.length > 250) return false;

    // 2. Prevent nested quantifiers which are the primary cause of ReDoS
    // e.g., (a+)+, (.*)*, (a{1,2})*
    // This heuristic regex checks for a group `(...)` that contains a quantifier `+`, `*`, or `{...}`
    // and is immediately followed by another quantifier.
    const nestedQuantifier = /\([^)]*(?:\+|\*|\{\d+(?:,\d*)?\})[^)]*\)(?:\+|\*|\{\d+(?:,\d*)?\})/;
    if (nestedQuantifier.test(pattern)) {
        return false;
    }

    // 3. Ensure it's a valid RegExp (compiles without syntax error)
    try {
        new RegExp(pattern);
        return true;
    } catch {
        return false;
    }
}
