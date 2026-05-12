/**
 * Security utility functions
 */

/**
 * Validates a user-provided regular expression pattern to prevent
 * Regular Expression Denial of Service (ReDoS) vulnerabilities.
 *
 * Enforces a 250-character limit and uses a heuristic to block dangerous
 * nested quantifiers (e.g., `(a+)+`) before compiling to RegExp.
 */
export function validateRegexPattern(pattern: string): boolean {
    if (!pattern) return true;

    // Hard limit on pattern length to prevent excessively large compilation
    if (pattern.length > 250) return false;

    // Heuristic: reject nested quantifiers like (a+)+ which can cause ReDoS
    // Carefully designed to not flag valid lazy quantifiers like *?
    const nestedQuantifierRegex = /\([^)]*(?:[+*]|\{\d+(?:,\d*)?\})[^)]*\)(?:[+*]|\{\d+(?:,\d*)?\})/;
    if (nestedQuantifierRegex.test(pattern)) {
        return false;
    }

    try {
        new RegExp(pattern);
        return true;
    } catch {
        return false;
    }
}
